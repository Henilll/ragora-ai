import json
import time
from collections import Counter, defaultdict
from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from app.core.config import Settings, get_settings
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    DocumentItem,
    HistoryItem,
    UploadResponse,
    WidgetChatRequest,
    WidgetConfig,
    WidgetConfigRequest,
    WidgetAnalytics,
    WidgetHistory,
)
from app.services.chunking import chunk_text
from app.services.db import DatabaseService
from app.services.embeddings import EmbeddingService
from app.services.errors import ExternalServiceError
from app.services.llm import LLMService
from app.services.pdf import extract_pdf_text

router = APIRouter()
WIDGET_SCRIPT_PATH = Path(__file__).resolve().parents[1] / "static" / "widget.js"
RAGORA_SCRIPT_PATH = Path(__file__).resolve().parents[1] / "static" / "ragora-chat.js"


def _normalize_message(message: str) -> str:
    return " ".join(message.lower().strip().split())


def _is_greeting(message: str) -> bool:
    normalized = _normalize_message(message).strip("!.?, ")
    return normalized in {"hi", "hy", "hey", "hello", "hii", "helo"}


def _is_document_list_question(message: str) -> bool:
    normalized = _normalize_message(message)
    doc_terms = {"doc", "docs", "document", "documents", "pdf", "pdfs", "file", "files"}
    list_terms = {"which", "what", "list", "show", "uploaded", "available"}
    words = set(normalized.replace("?", "").split())
    return bool(words & doc_terms) and bool(words & list_terms)


def _format_documents_answer(documents: list[dict]) -> str:
    if not documents:
        return "You have not uploaded any PDF documents yet."

    lines = ["Your uploaded PDF documents are:"]
    for index, document in enumerate(documents, start=1):
        lines.append(f"{index}. {document['file_name']} ({document['chunk_count']} chunks)")
    return "\n".join(lines)


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _has_answer(answer: str, fallback_message: str = "I don't know.") -> bool:
    normalized = _normalize_message(answer).strip(".!")
    fallback = _normalize_message(fallback_message).strip(".!")
    return normalized not in {"i don't know", "i do not know"} and normalized != fallback


def _embed_script(request: Request, widget_id: str) -> str:
    base_url = str(request.base_url).rstrip("/")
    return (
        f'<script src="{base_url}/widget/ragora-chat.js"\n'
        f'  data-key="{widget_id}"\n'
        '  data-mode="search"\n'
        '  data-shortcut="true"\n'
        '  data-theme="auto"\n'
        '  defer></script>'
    )


def get_db() -> DatabaseService:
    from app.main import app

    return app.state.db


def get_embeddings() -> EmbeddingService:
    from app.main import app

    return app.state.embeddings


def get_llm() -> LLMService:
    from app.main import app

    return app.state.llm


@router.get("/widget.js", include_in_schema=False)
async def widget_script() -> FileResponse:
    return FileResponse(WIDGET_SCRIPT_PATH, media_type="application/javascript")


@router.get("/widget/ragora-chat.js", include_in_schema=False)
async def ragora_widget_script() -> FileResponse:
    return FileResponse(RAGORA_SCRIPT_PATH, media_type="application/javascript")


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    user_id: str = Form(...),
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
    embeddings: EmbeddingService = Depends(get_embeddings),
) -> UploadResponse:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        file_bytes = await file.read()
        text = extract_pdf_text(file_bytes)
        chunks = chunk_text(text, settings.chunk_size, settings.chunk_overlap)
        if not chunks:
            raise HTTPException(status_code=400, detail="No extractable text found in this PDF.")

        vectors = await embeddings.embed_texts(chunks)
        document_id = await db.create_document(user_id=user_id, file_name=file.filename or "document.pdf")
        await db.insert_chunks(user_id=user_id, document_id=document_id, chunks=chunks, embeddings=vectors)
        await db.update_document_chunk_count(document_id=document_id, chunk_count=len(chunks))
    except ExternalServiceError as exc:
        status_code = 502 if exc.status_code is None or exc.status_code >= 500 else 400
        raise HTTPException(
            status_code=status_code,
            detail=f"{exc.service} failed during upload: {exc.detail}",
        ) from exc

    return UploadResponse(document_id=document_id, file_name=file.filename or "document.pdf", chunk_count=len(chunks))


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: DatabaseService = Depends(get_db),
    embeddings: EmbeddingService = Depends(get_embeddings),
    llm: LLMService = Depends(get_llm),
):
    await db.insert_chat(user_id=request.user_id, message=request.message, role="user")

    if _is_greeting(request.message):
        answer = "Hello. Upload a PDF, then ask me a question about it."
        await db.insert_chat(user_id=request.user_id, message=answer, role="bot")
        if request.stream:
            return StreamingResponse(_stream_static_answer(answer), media_type="text/event-stream")
        return ChatResponse(answer=answer, sources=[])

    if _is_document_list_question(request.message):
        documents = await db.get_documents(user_id=request.user_id)
        answer = _format_documents_answer(documents)
        await db.insert_chat(user_id=request.user_id, message=answer, role="bot")
        if request.stream:
            return StreamingResponse(_stream_static_answer(answer), media_type="text/event-stream")
        return ChatResponse(answer=answer, sources=[])

    context, sources = await _retrieve_context(request.user_id, request.message, db, embeddings)

    if request.stream:
        return StreamingResponse(
            _stream_and_save_answer(llm, db, request.user_id, context, request.message, sources),
            media_type="text/event-stream",
        )

    answer = await llm.answer(context=context, question=request.message)
    await db.insert_chat(user_id=request.user_id, message=answer, role="bot")
    return ChatResponse(answer=answer, sources=sources)


@router.post("/widgets", response_model=WidgetConfig)
async def create_or_update_widget(
    config: WidgetConfigRequest,
    request: Request,
    db: DatabaseService = Depends(get_db),
) -> dict:
    widget = await db.upsert_widget(config.model_dump())
    widget["embed_script"] = _embed_script(request, widget["widget_id"])
    return widget


@router.get("/widgets", response_model=WidgetConfig | None)
async def widget_for_user(
    request: Request,
    user_id: str = Query(...),
    db: DatabaseService = Depends(get_db),
) -> dict | None:
    widget = await db.get_widget_for_user(user_id=user_id)
    if widget:
        widget["embed_script"] = _embed_script(request, widget["widget_id"])
    return widget


@router.get("/widgets/{widget_id}/config")
async def public_widget_config(widget_id: str, db: DatabaseService = Depends(get_db)) -> dict:
    widget = await db.get_widget(widget_id=widget_id)
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found.")
    return {
        "widget_id": widget["widget_id"],
        "title": widget["title"],
        "welcome_message": widget["welcome_message"],
        "theme": widget["theme"],
        "accent_color": widget["accent_color"],
        "secondary_color": widget["secondary_color"],
        "logo_url": widget["logo_url"],
        "icon_label": widget["icon_label"],
        "launcher_style": widget["launcher_style"],
        "border_radius": widget["border_radius"],
        "launcher_label": widget["launcher_label"],
        "input_placeholder": widget["input_placeholder"],
        "position": widget["position"],
        "collect_leads": widget["collect_leads"],
    }


@router.post("/widgets/{widget_id}/chat", response_model=ChatResponse)
async def widget_chat(
    widget_id: str,
    request: WidgetChatRequest,
    db: DatabaseService = Depends(get_db),
    embeddings: EmbeddingService = Depends(get_embeddings),
    llm: LLMService = Depends(get_llm),
):
    widget = await db.get_widget(widget_id=widget_id)
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found.")

    owner_user_id = widget["user_id"]
    started_at = time.perf_counter()
    await db.insert_widget_chat(
        widget_id,
        owner_user_id,
        request.visitor_id,
        request.message,
        "user",
        token_count=_estimate_tokens(request.message),
    )

    if _is_greeting(request.message):
        answer = widget["welcome_message"]
        await db.insert_widget_chat(
            widget_id,
            owner_user_id,
            request.visitor_id,
            answer,
            "bot",
            token_count=_estimate_tokens(answer),
            latency_ms=int((time.perf_counter() - started_at) * 1000),
            had_answer=True,
        )
        if request.stream:
            return StreamingResponse(_stream_static_answer(answer), media_type="text/event-stream")
        return ChatResponse(answer=answer, sources=[])

    context, sources = await _retrieve_context(owner_user_id, request.message, db, embeddings)

    if request.stream:
        return StreamingResponse(
            _stream_widget_answer(
                llm,
                db,
                widget,
                owner_user_id,
                request.visitor_id,
                context,
                request.message,
                sources,
                started_at,
            ),
            media_type="text/event-stream",
        )

    answer = await llm.answer_widget(context=context, question=request.message, widget=widget)
    await db.insert_widget_chat(
        widget_id,
        owner_user_id,
        request.visitor_id,
        answer,
        "bot",
        token_count=_estimate_tokens(answer),
        latency_ms=int((time.perf_counter() - started_at) * 1000),
        had_answer=_has_answer(answer, widget["fallback_message"]),
    )
    return ChatResponse(answer=answer, sources=sources)


@router.get("/analytics", response_model=WidgetAnalytics)
async def analytics(user_id: str = Query(...), db: DatabaseService = Depends(get_db)) -> dict:
    rows = await db.get_widget_chats(user_id=user_id)
    user_rows = [row for row in rows if row["role"] == "user"]
    bot_rows = [row for row in rows if row["role"] == "bot"]
    visitors = {row["visitor_id"] for row in rows}
    unanswered_bot_rows = [row for row in bot_rows if row.get("had_answer") is False]
    total_tokens = sum(row.get("token_count") or 0 for row in rows)
    latency_values = [row["latency_ms"] for row in bot_rows if row.get("latency_ms") is not None]

    question_counts = Counter(_normalize_message(row["message"]) for row in user_rows)
    top_questions = [
        {"question": question, "count": count}
        for question, count in question_counts.most_common(8)
    ]

    unanswered_questions = []
    unanswered_seen = set()
    sorted_rows = sorted(rows, key=lambda row: row["timestamp"])
    for index, row in enumerate(sorted_rows):
        if row["role"] != "bot" or row.get("had_answer") is not False:
            continue
        previous_user = next(
            (
                candidate
                for candidate in reversed(sorted_rows[:index])
                if candidate["role"] == "user" and candidate["visitor_id"] == row["visitor_id"]
            ),
            None,
        )
        if previous_user and previous_user["message"] not in unanswered_seen:
            unanswered_seen.add(previous_user["message"])
            unanswered_questions.append({"question": previous_user["message"], "timestamp": row["timestamp"]})

    daily_counter: dict[str, int] = defaultdict(int)
    for row in user_rows:
        daily_counter[row["timestamp"][:10]] += 1

    return {
        "total_messages": len(rows),
        "user_messages": len(user_rows),
        "bot_messages": len(bot_rows),
        "unique_visitors": len(visitors),
        "unanswered_count": len(unanswered_bot_rows),
        "total_tokens": total_tokens,
        "average_latency_ms": int(sum(latency_values) / len(latency_values)) if latency_values else 0,
        "top_questions": top_questions,
        "unanswered_questions": unanswered_questions[:8],
        "daily_messages": [{"date": date, "count": count} for date, count in sorted(daily_counter.items())[-14:]],
    }


@router.get("/widget-history", response_model=WidgetHistory)
async def widget_history(user_id: str = Query(...), db: DatabaseService = Depends(get_db)) -> dict:
    rows = sorted(await db.get_widget_chats(user_id=user_id, limit=800), key=lambda row: row["timestamp"], reverse=True)
    grouped: dict[str, dict] = {}
    for row in rows:
        visitor_id = row["visitor_id"]
        if visitor_id not in grouped:
            grouped[visitor_id] = {
                "visitor_id": visitor_id,
                "last_seen": row["timestamp"],
                "message_count": 0,
                "last_message": row["message"],
                "messages": [],
            }
        grouped[visitor_id]["message_count"] += 1
        grouped[visitor_id]["messages"].append(
            {
                "role": row["role"],
                "message": row["message"],
                "timestamp": row["timestamp"],
                "had_answer": row.get("had_answer"),
            }
        )

    conversations = list(grouped.values())
    for conversation in conversations:
        conversation["messages"] = list(reversed(conversation["messages"][-30:]))
    return {"conversations": conversations[:30]}


async def _retrieve_context(
    user_id: str,
    question: str,
    db: DatabaseService,
    embeddings: EmbeddingService,
) -> tuple[str, list[str]]:
    query_embedding = await embeddings.embed_query(question)
    matches = await db.match_chunks(user_id=user_id, embedding=query_embedding, top_k=5)
    context = "\n\n".join(match["chunk_text"] for match in matches)
    sources = sorted({match["document_id"] for match in matches})
    return context, sources


async def _stream_static_answer(answer: str) -> AsyncIterator[str]:
    yield "event: sources\ndata: []\n\n"
    yield f"data: {json.dumps(answer)}\n\n"
    yield "event: done\ndata: [DONE]\n\n"


async def _stream_widget_answer(
    llm: LLMService,
    db: DatabaseService,
    widget: dict,
    owner_user_id: str,
    visitor_id: str,
    context: str,
    question: str,
    sources: list[str],
    started_at: float,
) -> AsyncIterator[str]:
    answer_parts: list[str] = []
    yield f"event: sources\ndata: {json.dumps(sources)}\n\n"
    try:
        async for token in llm.stream_widget_answer(context=context, question=question, widget=widget):
            answer_parts.append(token)
            yield f"data: {json.dumps(token)}\n\n"
    except ExternalServiceError as exc:
        detail = f"{exc.service} failed during chat: {exc.detail}"
        yield f"event: error\ndata: {json.dumps(detail)}\n\n"
        return
    answer = "".join(answer_parts).strip()
    await db.insert_widget_chat(
        widget["widget_id"],
        owner_user_id,
        visitor_id,
        answer,
        "bot",
        token_count=_estimate_tokens(answer),
        latency_ms=int((time.perf_counter() - started_at) * 1000),
        had_answer=_has_answer(answer, widget["fallback_message"]),
    )
    yield "event: done\ndata: [DONE]\n\n"


async def _stream_and_save_answer(
    llm: LLMService,
    db: DatabaseService,
    user_id: str,
    context: str,
    question: str,
    sources: list[str],
) -> AsyncIterator[str]:
    answer_parts: list[str] = []
    yield f"event: sources\ndata: {json.dumps(sources)}\n\n"
    try:
        async for token in llm.stream_answer(context=context, question=question):
            answer_parts.append(token)
            yield f"data: {json.dumps(token)}\n\n"
    except ExternalServiceError as exc:
        detail = f"{exc.service} failed during chat: {exc.detail}"
        yield f"event: error\ndata: {json.dumps(detail)}\n\n"
        return
    await db.insert_chat(user_id=user_id, message="".join(answer_parts).strip(), role="bot")
    yield "event: done\ndata: [DONE]\n\n"


@router.get("/history", response_model=list[HistoryItem])
async def history(user_id: str = Query(...), db: DatabaseService = Depends(get_db)) -> list[dict]:
    return await db.get_history(user_id=user_id)


@router.get("/documents", response_model=list[DocumentItem])
async def documents(user_id: str = Query(...), db: DatabaseService = Depends(get_db)) -> list[dict]:
    return await db.get_documents(user_id=user_id)


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: str,
    user_id: str = Query(...),
    db: DatabaseService = Depends(get_db),
) -> None:
    await db.delete_document(user_id=user_id, document_id=document_id)
