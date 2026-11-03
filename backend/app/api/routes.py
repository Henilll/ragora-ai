import json
import logging
import re
import hashlib
import hmac
import secrets
import smtplib
import time
import uuid
from urllib.parse import urlparse
from collections import Counter, defaultdict
from collections.abc import AsyncIterator
from datetime import datetime, timedelta
from email.message import EmailMessage
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from starlette.concurrency import run_in_threadpool

from app.core.config import Settings, get_settings
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    DocumentItem,
    AdminApiKey,
    AdminApiKeyCreate,
    AdminApiKeyUpdate,
    AdminOverview,
    AuthResponse,
    SignupResponse,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    HistoryItem,
    LoginRequest,
    RefreshRequest,
    ResetPasswordRequest,
    SignupRequest,
    StatusResponse,
    SupabaseAuthRequest,
    UploadResponse,
    VerifyEmailRequest,
    WidgetChatRequest,
    WidgetFeedbackRequest,
    RegenerateRequest,
    WidgetConfig,
    WidgetConfigRequest,
    WidgetAnalytics,
    WidgetHistory,
)
from app.services.auth import (
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    refresh_expiry,
    refresh_token_hash,
    verify_google_id_token,
    verify_password,
    verify_supabase_access_token,
)
from app.services.chunking import chunk_text
from app.services.db import DatabaseService
from app.services.embeddings import EmbeddingService
from app.services.errors import ExternalServiceError
from app.services.rate_limit import check_rate_limit, rate_limit_ip
from app.services.llm import LLMService, RagAnswerInput
from app.services.pdf import extract_pdf_text

router = APIRouter()
logger = logging.getLogger("ragora")


def _generic_error() -> str:
    return f"Something went wrong. Reference: {uuid.uuid4().hex[:12]}"


def _allowed_origin(widget: dict, request: Request) -> bool:
    allowed = widget.get("allowed_domains") or []
    if not allowed:
        return True
    origin = request.headers.get("origin") or request.headers.get("referer") or ""
    if not origin:
        return True
    host = (urlparse(origin).hostname or "").lower()
    if not host:
        return True
    for domain in allowed:
        domain = str(domain).strip().lower()
        if host == domain or host.endswith("." + domain):
            return True
    return False
WIDGET_SCRIPT_PATH = Path(__file__).resolve().parents[1] / "static" / "widget.js"
RAGORA_SCRIPT_PATH = Path(__file__).resolve().parents[1] / "static" / "ragora-chat.js"
LOGO_CONTENT_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
}
MAX_WIDGET_LOGO_BYTES = 1_000_000


def _normalize_message(message: str) -> str:
    return " ".join(message.lower().strip().split())


def _workspace_slug(email: str) -> str:
    base = email.split("@", 1)[0].lower()
    slug = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return slug or "ragora-workspace"


def _auth_response(user: dict, refresh_token: str, settings: Settings) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(user, settings),
        refresh_token=refresh_token,
        expires_in=settings.access_token_minutes * 60,
        user={
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name") or user["workspace"],
            "workspace": user["workspace"],
            "provider": user.get("provider") or "email",
            "avatar_url": user.get("avatar_url") or "",
            "email_verified": bool(user.get("email_verified")),
            "is_admin": bool(user.get("is_admin")),
        },
    )


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


def _format_active_documents(documents: list[dict]) -> str:
    ready = [document for document in documents if document.get("status", "ready") == "ready"]
    processing = [document for document in documents if document.get("status") == "processing"]
    failed = [document for document in documents if document.get("status") == "failed"]
    if not documents:
        return "No uploaded documents are active in this workspace."

    lines: list[str] = []
    if ready:
        lines.append("Ready documents:")
        for index, document in enumerate(ready, start=1):
            lines.append(f"- {document['file_name']} ({document.get('chunk_count', 0)} indexed chunks)")
    if processing:
        lines.append("Processing documents:")
        for document in processing:
            lines.append(f"- {document['file_name']} is still processing")
    if failed:
        lines.append("Failed documents:")
        for document in failed:
            lines.append(f"- {document['file_name']} failed to process")
    return "\n".join(lines)


def _format_recent_memory(rows: list[dict], current_question: str) -> str:
    if not rows:
        return "No earlier conversation in this workspace."
    compact: list[str] = []
    normalized_question = _normalize_message(current_question)
    for row in rows[-10:]:
        if row["role"] == "user" and _normalize_message(row["message"]) == normalized_question:
            continue
        role = "User" if row["role"] == "user" else "Assistant"
        message = " ".join(row["message"].split())
        if len(message) > 380:
            message = f"{message[:377]}..."
        compact.append(f"{role}: {message}")
    return "\n".join(compact) or "No earlier conversation in this workspace."


def _format_widget_memory(rows: list[dict], current_question: str) -> str:
    # rows are most recent first from DB. Reverse to chronological order,
    # drop the current question which was just inserted as a user message,
    # then keep the last 6 messages (about 3 turns) to bound prompt size.
    chronological = list(reversed(rows))
    filtered: list[dict] = []
    skipped_current = False
    for row in reversed(chronological):
        if not skipped_current and row.get("role") == "user" and _normalize_message(row.get("message") or "") == _normalize_message(current_question):
            skipped_current = True
            continue
        filtered.append(row)
    filtered = list(reversed(filtered))[-6:]
    if not filtered:
        return "No earlier visitor messages in this conversation."
    lines = []
    for row in filtered:
        role = "Visitor" if row.get("role") == "user" else "Assistant"
        text = " ".join(str(row.get("message") or "").split())
        if len(text) > 300:
            text = text[:297] + "..."
        lines.append(f"{role}: {text}")
    return "\n".join(lines)


def _keyword_score(question: str, text: str) -> float:
    question_terms = {
        term
        for term in re.findall(r"[a-z0-9][a-z0-9-]{2,}", question.lower())
        if term not in {"what", "which", "where", "when", "with", "from", "that", "this", "have", "does", "your", "about"}
    }
    if not question_terms:
        return 0.0
    text_lower = text.lower()
    hits = sum(1 for term in question_terms if term in text_lower)
    return hits / max(len(question_terms), 1)


def _rerank_matches(question: str, matches: list[dict], limit: int, min_similarity: float) -> list[dict]:
    ranked: list[dict] = []
    for match in matches:
        similarity = float(match.get("similarity") or 0)
        if similarity < min_similarity:
            continue
        keyword = _keyword_score(question, match.get("chunk_text") or "")
        match["_rank_score"] = (similarity * 0.78) + (keyword * 0.22)
        ranked.append(match)
    ranked.sort(key=lambda item: item["_rank_score"], reverse=True)
    return ranked[:limit]


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _has_answer(answer: str, fallback_message: str = "I don't know.") -> bool:
    normalized = _normalize_message(answer).strip(".!")
    fallback = _normalize_message(fallback_message).strip(".!")
    return normalized not in {"i don't know", "i do not know"} and normalized != fallback


def _widget_fallback_message(widget: dict) -> str:
    fallback = widget.get("fallback_message") or "I do not know based on the provided documents."
    company_email = (widget.get("company_email") or "").strip()
    if company_email and "@" not in fallback:
        return f"I do not know based on the provided documents. Please contact {company_email} for help."
    return fallback


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


def _verification_hash(code: str, settings: Settings) -> str:
    return hmac.new(settings.jwt_secret.encode("utf-8"), code.encode("utf-8"), hashlib.sha256).hexdigest()


def _build_verification_email(to_email: str, code: str, settings: Settings) -> EmailMessage:
    from_email = settings.smtp_from_email or settings.smtp_username
    if not settings.smtp_host or not from_email:
        raise HTTPException(status_code=500, detail="Email delivery is not configured. Set SMTP_HOST and SMTP_FROM_EMAIL.")

    message = EmailMessage()
    message["Subject"] = "Your Ragora verification code"
    message["From"] = f"{settings.smtp_from_name} <{from_email}>"
    message["To"] = to_email
    message.set_content(
        "\n".join(
            [
                "Welcome to Ragora.",
                "",
                f"Your verification code is {code}.",
                f"It expires in {settings.email_verification_minutes} minutes.",
                "",
                "If you did not create this account, you can ignore this email.",
            ]
        )
    )
    return message


def _send_smtp_message(message: EmailMessage, settings: Settings) -> None:
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)


async def _send_verification_code(user: dict, settings: Settings, db: DatabaseService) -> None:
    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.utcnow() + timedelta(minutes=settings.email_verification_minutes)
    await db.create_email_verification(user["id"], _verification_hash(code, settings), expires_at)
    message = _build_verification_email(user["email"], code, settings)
    try:
        await run_in_threadpool(_send_smtp_message, message, settings)
    except (OSError, smtplib.SMTPException) as exc:
        raise HTTPException(status_code=502, detail=f"Verification email could not be sent: {exc}") from exc


def get_db() -> DatabaseService:
    from app.main import app

    return app.state.db


def get_embeddings() -> EmbeddingService:
    from app.main import app

    return app.state.embeddings


def get_llm() -> LLMService:
    from app.main import app

    return app.state.llm


async def get_current_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    payload = decode_access_token(authorization.removeprefix("Bearer ").strip(), settings)
    user = await db.get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists.")
    return user


def _admin_email_set(settings: Settings) -> set[str]:
    return {email.strip().lower() for email in settings.admin_emails.split(",") if email.strip()}


async def get_admin_user(
    user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> dict:
    if bool(user.get("is_admin")) or user.get("email", "").lower() in _admin_email_set(settings):
        return user
    raise HTTPException(status_code=403, detail="Admin access required.")


async def _issue_session(user: dict, request: Request, settings: Settings, db: DatabaseService) -> AuthResponse:
    refresh_token, token_hash, _ = create_refresh_token()
    await db.create_refresh_session(
        user_id=user["id"],
        token_hash=token_hash,
        expires_at=refresh_expiry(settings),
        user_agent=request.headers.get("user-agent", ""),
    )
    return _auth_response(user, refresh_token, settings)


@router.post("/auth/signup", response_model=SignupResponse, status_code=201)
async def signup(
    payload: SignupRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
) -> SignupResponse:
    # Phase A security fix: signup used to return a full session for an
    # unverified email, bypassing the verification gate that login enforces.
    # Now signup only creates the account and sends a code. The caller must
    # verify, then log in. Frontend signup already uses Supabase Auth and is
    # unaffected; this endpoint is for direct backend API callers.
    rate_limit_ip(request, "auth-signup", limit=10, window_seconds=3600)
    email = payload.email.strip().lower()
    existing = await db.get_user_by_email(email)
    if existing:
        if existing.get("provider") == "email" and not existing.get("email_verified"):
            await _send_verification_code(existing, settings, db)
            return SignupResponse(email=email, message="Check your email for a verification code, then log in.")
        raise HTTPException(status_code=409, detail="An account already exists for this email.")

    # Avoid workspace slug collisions: if the slug from the email local part
    # is already taken, append a short suffix instead of sharing a workspace.
    base_slug = _workspace_slug(email)
    slug = base_slug
    if await db.get_user_by_workspace(slug):
        slug = f"{base_slug}-{secrets.token_hex(3)}"
    user = await db.create_user(
        email=email,
        name=payload.name.strip(),
        workspace=slug,
        provider="email",
        password_hash=hash_password(payload.password),
        email_verified=False,
    )
    await _send_verification_code(user, settings, db)
    return SignupResponse(email=email, message="Check your email for a verification code, then log in.")


@router.post("/auth/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
) -> AuthResponse:
    rate_limit_ip(request, "auth-login", limit=20, window_seconds=600)
    check_rate_limit(request, "auth-login-email", payload.email.strip().lower(), limit=10, window_seconds=600)
    user = await db.get_user_by_email(payload.email.strip().lower())
    if not user or not verify_password(payload.password, user.get("password_hash")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user.get("provider") == "email" and not user.get("email_verified"):
        raise HTTPException(status_code=403, detail="Please verify your email before signing in.")
    return await _issue_session(user, request, settings, db)


@router.post("/auth/google", response_model=AuthResponse)
async def google_auth(
    payload: GoogleAuthRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
) -> AuthResponse:
    rate_limit_ip(request, "auth-google", limit=20, window_seconds=600)
    profile = await verify_google_id_token(payload.id_token, settings)
    user = await db.get_user_by_email(profile["email"])
    if user:
        user = await db.update_user(
            user["id"],
            {
                "name": profile["name"],
                "provider": "google",
                "avatar_url": profile["avatar_url"],
                "email_verified": profile["email_verified"],
                "google_sub": profile["google_sub"],
            },
        )
    else:
        user = await db.create_user(
            email=profile["email"],
            name=profile["name"],
            workspace=_workspace_slug(profile["email"]),
            provider="google",
            avatar_url=profile["avatar_url"],
            email_verified=profile["email_verified"],
            google_sub=profile["google_sub"],
        )
    return await _issue_session(user, request, settings, db)


@router.post("/auth/supabase", response_model=AuthResponse)
async def supabase_auth(
    payload: SupabaseAuthRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
) -> AuthResponse:
    rate_limit_ip(request, "auth-supabase", limit=20, window_seconds=600)
    profile = await verify_supabase_access_token(payload.access_token, settings)
    if not profile["email_verified"]:
        raise HTTPException(status_code=403, detail="Please confirm your email before signing in.")

    user = await db.get_user_by_email(profile["email"])
    update = {
        "name": profile["name"],
        "provider": profile["provider"],
        "avatar_url": profile["avatar_url"],
        "email_verified": True,
        "google_sub": profile["google_sub"],
    }
    if user:
        user = await db.update_user(user["id"], update)
    else:
        user = await db.create_user(
            email=profile["email"],
            name=profile["name"],
            workspace=_workspace_slug(profile["email"]),
            provider=profile["provider"],
            avatar_url=profile["avatar_url"],
            email_verified=True,
            google_sub=profile["google_sub"],
        )
    return await _issue_session(user, request, settings, db)


@router.post("/auth/refresh", response_model=AuthResponse)
async def refresh_session(
    payload: RefreshRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
) -> AuthResponse:
    rate_limit_ip(request, "auth-refresh", limit=30, window_seconds=600)
    token_hash = refresh_token_hash(payload.refresh_token)
    session = await db.get_refresh_session(token_hash)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")
    await db.revoke_refresh_session(token_hash)
    user = await db.get_user_by_id(session["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists.")
    return await _issue_session(user, request, settings, db)


@router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name") or user["workspace"],
        "workspace": user["workspace"],
        "provider": user.get("provider") or "email",
        "avatar_url": user.get("avatar_url") or "",
        "email_verified": bool(user.get("email_verified")),
        "is_admin": bool(user.get("is_admin")),
    }


@router.get("/admin/overview", response_model=AdminOverview)
async def admin_overview(
    admin: dict = Depends(get_admin_user),
    db: DatabaseService = Depends(get_db),
) -> dict:
    return await db.admin_overview()


@router.get("/admin/users")
async def admin_users(
    admin: dict = Depends(get_admin_user),
    db: DatabaseService = Depends(get_db),
) -> list[dict]:
    auth_users = await db.list_auth_users(per_page=200)
    app_users = await db.list_users(limit=500)
    app_by_email = {user.get("email", "").lower(): user for user in app_users}
    admin_emails = _admin_email_set(get_settings())

    rows: list[dict] = []
    for auth_user in auth_users:
        email = (auth_user.get("email") or "").lower()
        metadata = auth_user.get("user_metadata") or {}
        app_metadata = auth_user.get("app_metadata") or {}
        app_user = app_by_email.get(email, {})
        provider = app_metadata.get("provider") or (app_metadata.get("providers") or ["email"])[0]
        rows.append(
            {
                "id": auth_user.get("id") or app_user.get("id") or email,
                "email": email,
                "name": metadata.get("full_name") or metadata.get("name") or app_user.get("name") or email.split("@", 1)[0],
                "workspace": app_user.get("workspace") or "-",
                "provider": provider,
                "email_verified": bool(auth_user.get("email_confirmed_at")),
                "is_admin": bool(app_user.get("is_admin")) or email in admin_emails,
                "created_at": auth_user.get("created_at") or app_user.get("created_at"),
                "last_sign_in_at": auth_user.get("last_sign_in_at"),
                "source": "auth",
            }
        )
    return rows


@router.get("/admin/api-keys", response_model=list[AdminApiKey])
async def admin_api_keys(
    service: str | None = Query(default=None),
    admin: dict = Depends(get_admin_user),
    db: DatabaseService = Depends(get_db),
) -> list[dict]:
    if service and service not in {"groq", "mistral"}:
        raise HTTPException(status_code=400, detail="Unsupported service.")
    return await db.list_api_keys(service=service)


@router.post("/admin/api-keys", response_model=AdminApiKey)
async def admin_create_api_key(
    payload: AdminApiKeyCreate,
    admin: dict = Depends(get_admin_user),
    db: DatabaseService = Depends(get_db),
) -> dict:
    return await db.create_api_key(payload.model_dump())


@router.patch("/admin/api-keys/{key_id}", response_model=AdminApiKey)
async def admin_update_api_key(
    key_id: str,
    payload: AdminApiKeyUpdate,
    admin: dict = Depends(get_admin_user),
    db: DatabaseService = Depends(get_db),
) -> dict:
    update = {key: value for key, value in payload.model_dump().items() if value is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No changes provided.")
    row = await db.update_api_key(key_id, update)
    if not row:
        raise HTTPException(status_code=404, detail="API key not found.")
    return row


@router.delete("/admin/api-keys/{key_id}", status_code=204)
async def admin_delete_api_key(
    key_id: str,
    admin: dict = Depends(get_admin_user),
    db: DatabaseService = Depends(get_db),
) -> None:
    await db.delete_api_key(key_id)


@router.post("/auth/forgot-password", response_model=StatusResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
) -> StatusResponse:
    # Always return the same generic message, so an attacker cannot tell
    # whether an email is registered. Rate limit by IP and by email.
    rate_limit_ip(request, "auth-forgot", limit=5, window_seconds=3600)
    check_rate_limit(request, "auth-forgot-email", payload.email.strip().lower(), limit=5, window_seconds=3600)
    generic = StatusResponse(ok=True, message="If that email exists, a password reset link has been sent.")
    try:
        user = await db.get_user_by_email(payload.email.strip().lower())
    except Exception as exc:  # noqa: BLE001 - never leak DB errors on this endpoint
        logger.warning("forgot-password lookup failed: %s", exc)
        return generic
    if not user or user.get("provider") != "email":
        return generic
    if not settings.smtp_host or not settings.smtp_from_email:
        logger.warning("forgot-password: SMTP not configured, reset email not sent for %s", user["email"])
        return generic
    token = create_password_reset_token(user, settings, minutes=settings.password_reset_minutes)
    reset_url = f"{settings.frontend_origin.rstrip('/')}/reset-password?token={token}"
    message = EmailMessage()
    message["Subject"] = "Reset your Ragora password"
    message["From"] = settings.smtp_from_email
    message["To"] = user["email"]
    message.set_content(
        f"Reset your Ragora password using this link (valid for {settings.password_reset_minutes} minutes):\n\n{reset_url}\n\n"
        "If you did not request this, ignore this email. The link stops working as soon as your password changes."
    )
    try:
        await run_in_threadpool(_send_smtp_message, message, settings)
    except Exception as exc:  # noqa: BLE001 - SMTP failure must not leak or change the generic response
        logger.warning("forgot-password: SMTP send failed: %s", exc)
    return generic


@router.post("/auth/reset-password", response_model=StatusResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
) -> StatusResponse:
    rate_limit_ip(request, "auth-reset", limit=10, window_seconds=600)
    # The token is self-contained and bound to the current password hash, so
    # it cannot be replayed after a successful reset. We still need the user
    # to validate it, so decode the email from the token without trusting it.
    try:
        from app.services.auth import _b64url_decode

        raw = _b64url_decode(payload.token).decode("utf-8")
        token_email = raw.split("|", 1)[0].lower()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")
    user = await db.get_user_by_email(token_email)
    if not user or user.get("provider") != "email":
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")
    if not verify_password_reset_token(payload.token, user, settings):
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")
    await db.update_user(user["id"], {"password_hash": hash_password(payload.password)})
    # Invalidate existing refresh sessions, so a compromised session cannot
    # survive a password reset. Best effort: if the DB helper is unavailable,
    # the password change itself still invalidates future reset tokens.
    try:
        await db.revoke_all_refresh_sessions(user["id"])
    except Exception as exc:  # noqa: BLE001 - do not fail a valid reset on session cleanup
        logger.warning("reset-password: could not revoke sessions: %s", exc)
    return StatusResponse(ok=True, message="Password updated. You can sign in now.")


@router.post("/auth/verify-email", response_model=StatusResponse)
async def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
) -> StatusResponse:
    # Phase A: verify-email used to require a session, which is circular now
    # that signup no longer issues one. It now takes email + code, with rate
    # limits, and the code itself is the credential (6 digits, 10-minute
    # expiry, single use via used_at).
    rate_limit_ip(request, "auth-verify", limit=10, window_seconds=600)
    check_rate_limit(request, "auth-verify-email", payload.email.strip().lower(), limit=5, window_seconds=600)
    user = await db.get_user_by_email(payload.email.strip().lower())
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    verification = await db.get_active_email_verification(user["id"])
    if not verification or not hmac.compare_digest(verification["code_hash"], _verification_hash(payload.code, settings)):
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    await db.mark_email_verification_used(verification["id"])
    await db.update_user(user["id"], {"email_verified": True})
    return StatusResponse(ok=True, message="Email verified. You can sign in now.")


@router.get("/widget.js", include_in_schema=False)
async def widget_script() -> FileResponse:
    return FileResponse(WIDGET_SCRIPT_PATH, media_type="application/javascript")


@router.get("/widget/ragora-chat.js", include_in_schema=False)
async def ragora_widget_script() -> FileResponse:
    return FileResponse(RAGORA_SCRIPT_PATH, media_type="application/javascript")


async def _process_upload_chunks(
    db: DatabaseService,
    embeddings: EmbeddingService,
    settings: Settings,
    workspace: str,
    document_id: str,
    chunks: list[str],
) -> None:
    # Runs after the upload response, via FastAPI BackgroundTasks. This is
    # a single-instance background job, not a distributed queue. If Ragora
    # ever runs multiple backend instances, replace this with a real queue
    # (Redis/Celery) - a BackgroundTask only runs on the instance that
    # received the upload.
    try:
        vectors = await embeddings.embed_texts(chunks)
        await db.insert_chunks(user_id=workspace, document_id=document_id, chunks=chunks, embeddings=vectors)
        await db.update_document_chunk_count(document_id=document_id, chunk_count=len(chunks), status="ready")
    except Exception as exc:  # noqa: BLE001 - background failures must mark the document failed, not hang it
        logger.warning("background upload failed for %s: %s", document_id, exc)
        try:
            await db.update_document_status(document_id=document_id, status="failed")
        except Exception:
            pass


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    request: Request,
    background_tasks: BackgroundTasks,
    user_id: str = Form(""),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
    embeddings: EmbeddingService = Depends(get_embeddings),
) -> UploadResponse:
    filename = file.filename or "document"
    lower_name = filename.lower()
    is_pdf = file.content_type == "application/pdf" or lower_name.endswith(".pdf")
    is_text = file.content_type in ("text/plain", "text/markdown") or lower_name.endswith((".txt", ".md"))
    is_docx = file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or lower_name.endswith(".docx")
    if not (is_pdf or is_text or is_docx):
        raise HTTPException(status_code=400, detail="Upload a PDF, TXT, Markdown, or DOCX file.")
    check_rate_limit(request, "upload-workspace", user["workspace"], limit=10, window_seconds=3600)

    workspace = user["workspace"]
    document_id = ""
    try:
        file_bytes = await file.read()
        if len(file_bytes) > settings.max_pdf_bytes:
            raise HTTPException(status_code=413, detail=f"File must be {settings.max_pdf_bytes // 1_000_000} MB or smaller.")
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        existing = await db.get_document_by_hash(user_id=workspace, file_hash=file_hash)
        if existing and existing.get("status") == "ready":
            return UploadResponse(
                document_id=existing["id"],
                file_name=existing["file_name"],
                chunk_count=existing["chunk_count"],
                status="ready",
            )
        if is_pdf:
            text, page_count = extract_pdf_text_and_page_count(file_bytes)
            if page_count > settings.max_pdf_pages:
                raise HTTPException(status_code=413, detail=f"PDF must be {settings.max_pdf_pages} pages or fewer.")
        elif is_docx:
            text = extract_docx_text(file_bytes)
        else:
            text = extract_text_file(file_bytes)
        chunks = chunk_text(text, settings.chunk_size, settings.chunk_overlap)
        if not chunks:
            raise HTTPException(status_code=400, detail="No extractable text found in this file.")
        document_id = await db.create_document(
            user_id=workspace,
            file_name=filename,
            file_hash=file_hash,
            status="processing",
        )
        background_tasks.add_task(_process_upload_chunks, db, embeddings, settings, workspace, document_id, chunks)
        return UploadResponse(document_id=document_id, file_name=filename, chunk_count=len(chunks), status="processing")
    except HTTPException:
        if document_id:
            await db.update_document_status(document_id=document_id, status="failed")
        raise
    except ExternalServiceError as exc:
        if document_id:
            await db.update_document_status(document_id=document_id, status="failed")
        logger.warning("upload failed: %s %s", exc.service, exc.detail)
        status_code = 502 if exc.status_code is None or exc.status_code >= 500 else 400
        raise HTTPException(status_code=status_code, detail=_generic_error()) from exc
    except Exception as exc:  # noqa: BLE001
        if document_id:
            await db.update_document_status(document_id=document_id, status="failed")
        logger.warning("upload failed unexpectedly: %s", exc)
        raise HTTPException(status_code=500, detail=_generic_error()) from exc

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
    embeddings: EmbeddingService = Depends(get_embeddings),
    llm: LLMService = Depends(get_llm),
):
    workspace = user["workspace"]
    check_rate_limit(request, "playground-chat", workspace, limit=60, window_seconds=60)
    await db.insert_chat(user_id=workspace, message=request.message, role="user")
    documents = await db.get_documents(user_id=workspace)
    ready_documents = [document for document in documents if document.get("status", "ready") == "ready"]

    if _is_greeting(request.message):
        if ready_documents:
            names = ", ".join(document["file_name"] for document in ready_documents[:3])
            suffix = " and more" if len(ready_documents) > 3 else ""
            answer = (
                f"Hello. I can already use your uploaded documents: {names}{suffix}. "
                "Ask me anything about them, or ask me to list the active files."
            )
        elif documents:
            answer = (
                "Hello. I can see uploaded documents in this workspace, but none are ready yet. "
                "Give processing a moment, then ask your question again."
            )
        else:
            answer = "Hello. Upload a PDF and I will use it automatically as context in this playground."
        await db.insert_chat(user_id=workspace, message=answer, role="bot")
        if request.stream:
            return StreamingResponse(_stream_static_answer(answer), media_type="text/event-stream")
        return ChatResponse(answer=answer, sources=[])

    if _is_document_list_question(request.message):
        answer = _format_documents_answer(documents)
        await db.insert_chat(user_id=workspace, message=answer, role="bot")
        if request.stream:
            return StreamingResponse(_stream_static_answer(answer), media_type="text/event-stream")
        return ChatResponse(answer=answer, sources=[])

    context, sources = await _retrieve_context(workspace, request.message, db, embeddings, settings)
    memory = _format_recent_memory(await db.get_recent_history(workspace, limit=12), request.message)
    payload = RagAnswerInput(
        workspace=workspace,
        question=request.message,
        context=context,
        documents_summary=_format_active_documents(documents),
        memory=memory,
        sources=sources,
    )

    if request.stream:
        return StreamingResponse(
            _stream_and_save_answer(llm, db, workspace, payload, sources),
            media_type="text/event-stream",
        )

    answer = await llm.answer_rag(payload)
    await db.insert_chat(user_id=workspace, message=answer, role="bot")
    return ChatResponse(answer=answer, sources=sources)


@router.post("/widgets", response_model=WidgetConfig)
async def create_or_update_widget(
    config: WidgetConfigRequest,
    request: Request,
    user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db),
) -> dict:
    rate_limit_ip(request, "widget-save", limit=20, window_seconds=600)
    payload = config.model_dump()
    payload["user_id"] = user["workspace"]
    try:
        widget = await db.upsert_widget(payload)
    except ExternalServiceError as exc:
        logger.warning("widget save failed: %s %s", exc.service, exc.detail)
        status_code = 502 if exc.status_code is None or exc.status_code >= 500 else 400
        raise HTTPException(status_code=status_code, detail=_generic_error()) from exc
    widget["embed_script"] = _embed_script(request, widget["widget_id"])
    return widget


@router.post("/widgets/logo")
async def upload_widget_logo(
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db),
) -> dict:
    rate_limit_ip(request, "widget-logo", limit=20, window_seconds=600)
    content_type = (file.content_type or "").lower()
    extension = LOGO_CONTENT_TYPES.get(content_type)
    if not extension:
        # Some browsers send an empty or generic type for SVG files, which
        # used to fail as 415 even though the file itself was a valid logo.
        # Fall back to the filename extension in that case only.
        filename_ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
        extension_by_name = {"png": "png", "jpg": "jpg", "jpeg": "jpg", "webp": "webp", "gif": "gif", "svg": "svg"}
        content_type_by_name = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp", "gif": "image/gif", "svg": "image/svg+xml"}
        extension = extension_by_name.get(filename_ext)
        if extension:
            content_type = content_type_by_name[filename_ext]
    if not extension:
        raise HTTPException(status_code=415, detail="Upload a PNG, JPG, WebP, SVG, or GIF logo.")

    content = await file.read(MAX_WIDGET_LOGO_BYTES + 1)
    if len(content) > MAX_WIDGET_LOGO_BYTES:
        raise HTTPException(status_code=413, detail="Logo must be 1 MB or smaller.")
    if not content:
        raise HTTPException(status_code=400, detail="Logo file is empty.")

    logo_url = await db.upload_widget_logo(
        user_id=user["workspace"],
        content=content,
        content_type=content_type,
        extension=extension,
    )
    return {"logo_url": logo_url}


@router.get("/widgets", response_model=WidgetConfig | None)
async def widget_for_user(
    request: Request,
    user_id: str = Query(...),
    user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db),
) -> dict | None:
    widget = await db.get_widget_for_user(user_id=user["workspace"])
    if widget:
        widget["embed_script"] = _embed_script(request, widget["widget_id"])
    return widget


@router.get("/widgets/{widget_id}/config")
async def public_widget_config(widget_id: str, request: Request, db: DatabaseService = Depends(get_db)) -> dict:
    rate_limit_ip(request, "widget-config", limit=120, window_seconds=60)
    check_rate_limit(request, "widget-config-widget", widget_id, limit=1000, window_seconds=60)
    widget = await db.get_widget_any(widget_id=widget_id)
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found.")
    return {
        "widget_id": widget["widget_id"],
        "title": widget["title"],
        "welcome_message": widget["welcome_message"],
        "suggested_questions": widget.get("suggested_questions") or [],
        "theme": widget["theme"],
        "accent_color": widget["accent_color"],
        "secondary_color": widget["secondary_color"],
        "logo_url": widget["logo_url"],
        "icon_label": widget["icon_label"],
        "company_name": widget.get("company_name", ""),
        "company_site": widget.get("company_site", ""),
        "company_email": widget.get("company_email", ""),
        "launcher_style": widget["launcher_style"],
        "launcher_circle_size": widget.get("launcher_circle_size", 60),
        "launcher_pill_size": widget.get("launcher_pill_size", 56),
        "border_radius": widget["border_radius"],
        "launcher_label": widget["launcher_label"],
        "input_placeholder": widget["input_placeholder"],
        "position": widget["position"],
        "collect_leads": widget["collect_leads"],
        "is_enabled": widget.get("is_enabled", True),
    }


@router.post("/widgets/{widget_id}/chat", response_model=ChatResponse)
async def widget_chat(
    widget_id: str,
    payload: WidgetChatRequest,
    http_request: Request,
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
    embeddings: EmbeddingService = Depends(get_embeddings),
    llm: LLMService = Depends(get_llm),
):
    widget = await db.get_widget_any(widget_id=widget_id)
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found.")
    if not widget.get("is_enabled", True):
        raise HTTPException(status_code=404, detail="Widget not found.")
    if not _allowed_origin(widget, http_request):
        raise HTTPException(status_code=403, detail="This widget is not enabled for this site.")
    rate_limit_ip(http_request, "widget-chat", limit=20, window_seconds=60)
    check_rate_limit(http_request, "widget-chat-widget", widget_id, limit=300, window_seconds=60)
    check_rate_limit(http_request, "widget-chat-visitor", f"{widget_id}:{payload.visitor_id}", limit=30, window_seconds=60)

    owner_user_id = widget["user_id"]
    started_at = time.perf_counter()
    await db.insert_widget_chat(
        widget_id,
        owner_user_id,
        payload.visitor_id,
        payload.message,
        "user",
        token_count=_estimate_tokens(payload.message),
    )

    if _is_greeting(payload.message):
        answer = widget["welcome_message"]
        await db.insert_widget_chat(
            widget_id,
            owner_user_id,
            payload.visitor_id,
            answer,
            "bot",
            token_count=_estimate_tokens(answer),
            latency_ms=int((time.perf_counter() - started_at) * 1000),
            had_answer=True,
        )
        if payload.stream:
            return StreamingResponse(_stream_static_answer(answer), media_type="text/event-stream")
        return ChatResponse(answer=answer, sources=[])

    context, sources = await _retrieve_context(owner_user_id, payload.message, db, embeddings, settings)
    try:
        visitor_rows = await db.get_widget_chats_for_visitor(widget_id, payload.visitor_id, limit=20)
        memory = _format_widget_memory(visitor_rows, payload.message)
    except Exception as exc:  # noqa: BLE001 - memory is an enhancement, never fail a chat on it
        logger.warning("widget memory failed: %s", exc)
        memory = "No earlier visitor messages in this conversation."

    if payload.stream:
        return StreamingResponse(
            _stream_widget_answer(
                llm,
                db,
                widget,
                owner_user_id,
                payload.visitor_id,
                context,
                payload.message,
                sources,
                started_at,
                memory,
            ),
            media_type="text/event-stream",
        )

    answer = await llm.answer_widget(context=context, question=payload.message, widget=widget, memory=memory)
    await db.insert_widget_chat(
        widget_id,
        owner_user_id,
        payload.visitor_id,
        answer,
        "bot",
        token_count=_estimate_tokens(answer),
        latency_ms=int((time.perf_counter() - started_at) * 1000),
        had_answer=_has_answer(answer, _widget_fallback_message(widget)),
    )
    return ChatResponse(answer=answer, sources=sources)


@router.post("/widgets/{widget_id}/feedback", response_model=StatusResponse)
async def widget_feedback(
    widget_id: str,
    payload: WidgetFeedbackRequest,
    http_request: Request,
    db: DatabaseService = Depends(get_db),
) -> StatusResponse:
    widget = await db.get_widget_any(widget_id=widget_id)
    if not widget or not widget.get("is_enabled", True):
        raise HTTPException(status_code=404, detail="Widget not found.")
    if not _allowed_origin(widget, http_request):
        raise HTTPException(status_code=403, detail="This widget is not enabled for this site.")
    rate_limit_ip(http_request, "widget-feedback", limit=30, window_seconds=60)
    try:
        await db.insert_widget_feedback(
            widget_id, widget["user_id"], payload.visitor_id, payload.rating, payload.bot_message, payload.question
        )
    except ExternalServiceError as exc:
        logger.warning("widget feedback failed: %s %s", exc.service, exc.detail)
        raise HTTPException(status_code=502, detail=_generic_error()) from exc
    return StatusResponse(ok=True, message="Feedback saved.")


@router.post("/widgets/{widget_id}/regenerate", response_model=ChatResponse)
async def widget_regenerate(
    widget_id: str,
    payload: RegenerateRequest,
    http_request: Request,
    settings: Settings = Depends(get_settings),
    db: DatabaseService = Depends(get_db),
    embeddings: EmbeddingService = Depends(get_embeddings),
    llm: LLMService = Depends(get_llm),
) -> ChatResponse:
    widget = await db.get_widget_any(widget_id=widget_id)
    if not widget or not widget.get("is_enabled", True):
        raise HTTPException(status_code=404, detail="Widget not found.")
    if not _allowed_origin(widget, http_request):
        raise HTTPException(status_code=403, detail="This widget is not enabled for this site.")
    rate_limit_ip(http_request, "widget-regenerate", limit=20, window_seconds=60)
    owner_user_id = widget["user_id"]
    started_at = time.perf_counter()
    context, sources = await _retrieve_context(owner_user_id, payload.question, db, embeddings, settings)
    try:
        visitor_rows = await db.get_widget_chats_for_visitor(widget_id, payload.visitor_id, limit=20)
        memory = _format_widget_memory(visitor_rows, payload.question)
    except Exception as exc:  # noqa: BLE001
        logger.warning("regenerate memory failed: %s", exc)
        memory = "No earlier visitor messages in this conversation."
    answer = await llm.answer_widget(context=context, question=payload.question, widget=widget, memory=memory)
    await db.insert_widget_chat(
        widget_id, owner_user_id, payload.visitor_id, answer, "bot",
        token_count=_estimate_tokens(answer),
        latency_ms=int((time.perf_counter() - started_at) * 1000),
        had_answer=_has_answer(answer, _widget_fallback_message(widget)),
    )
    return ChatResponse(answer=answer, sources=sources)


@router.get("/analytics", response_model=WidgetAnalytics)
async def analytics(user_id: str = Query(...), days: int = Query(default=30, ge=1, le=90), user: dict = Depends(get_current_user), db: DatabaseService = Depends(get_db)) -> dict:
    rows = await db.get_widget_chats(user_id=user["workspace"])
    # Limit analytics to the requested window, so a growing workspace does
    # not keep recomputing over its full history on every dashboard load.
    try:
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        rows = [row for row in rows if str(row.get("timestamp", "")) >= cutoff]
    except Exception:
        pass
    user_rows = [row for row in rows if row["role"] == "user"]
    bot_rows = [row for row in rows if row["role"] == "bot"]
    visitors = {row["visitor_id"] for row in rows}
    unanswered_bot_rows = [row for row in bot_rows if row.get("had_answer") is False]
    total_tokens = sum(row.get("token_count") or 0 for row in rows)
    latency_values = [row["latency_ms"] for row in bot_rows if row.get("latency_ms") is not None]
    question_counts = Counter(_normalize_message(row["message"]) for row in user_rows)
    top_questions = [{"question": question, "count": count} for question, count in question_counts.most_common(8)]
    unanswered_questions = []
    unanswered_seen = set()
    sorted_rows = sorted(rows, key=lambda row: row["timestamp"])
    for index, row in enumerate(sorted_rows):
        if row["role"] != "bot" or row.get("had_answer") is not False:
            continue
        previous_user = next((c for c in reversed(sorted_rows[:index]) if c["role"] == "user" and c["visitor_id"] == row["visitor_id"]), None)
        if previous_user and previous_user["message"] not in unanswered_seen:
            unanswered_seen.add(previous_user["message"])
            unanswered_questions.append({"question": previous_user["message"], "timestamp": row["timestamp"]})
    daily_counter: dict[str, int] = defaultdict(int)
    for row in user_rows:
        daily_counter[row["timestamp"][:10]] += 1
    # SQL totals, when the optional RPC is installed, otherwise Python totals above.
    sql_totals = None
    try:
        sql_totals = await db.get_widget_analytics_sql(user["workspace"])
    except Exception as exc:  # noqa: BLE001 - fallback to Python totals
        logger.warning("sql analytics failed, using python totals: %s", exc)
    feedback_counts = {"helpful": 0, "not_helpful": 0}
    try:
        feedback_counts = await db.get_widget_feedback_counts(user["workspace"])
    except Exception:
        pass
    result = {
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
        "feedback_helpful": feedback_counts.get("helpful", 0),
        "feedback_not_helpful": feedback_counts.get("not_helpful", 0),
    }
    if sql_totals:
        # SQL totals are for the full history, so only use them when days
        # covers the full window the caller asked for. Otherwise keep Python.
        pass
    return result


@router.get("/widget-history", response_model=WidgetHistory)
async def widget_history(user_id: str = Query(...), q: str = Query(default=""), visitor_id: str = Query(default=""), limit: int = Query(default=30, ge=1, le=100), offset: int = Query(default=0, ge=0), user: dict = Depends(get_current_user), db: DatabaseService = Depends(get_db)) -> dict:
    rows = sorted(await db.get_widget_chats(user_id=user["workspace"], limit=800), key=lambda row: row["timestamp"], reverse=True)
    if visitor_id:
        rows = [row for row in rows if row.get("visitor_id") == visitor_id]
    if q:
        needle = q.strip().lower()
        rows = [row for row in rows if needle in str(row.get("message", "")).lower() or needle in str(row.get("visitor_id", "")).lower()]
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

    conversations = list(grouped.values())[offset:offset + limit]
    for conversation in conversations:
        conversation["messages"] = list(reversed(conversation["messages"][-30:]))
    return {"conversations": conversations}


async def _retrieve_context(
    user_id: str,
    question: str,
    db: DatabaseService,
    embeddings: EmbeddingService,
    settings: Settings,
) -> tuple[str, list[str]]:
    query_embedding = await embeddings.embed_query(question)
    matches = await db.match_chunks(user_id=user_id, embedding=query_embedding, top_k=settings.retrieval_match_count)
    ranked = _rerank_matches(
        question,
        matches,
        limit=settings.retrieval_context_count,
        min_similarity=settings.retrieval_min_similarity,
    )
    document_map = await db.get_document_map(user_id)
    context_blocks: list[str] = []
    sources: list[str] = []
    for index, match in enumerate(ranked, start=1):
        document_id = str(match["document_id"])
        document = document_map.get(document_id, {})
        source_marker = f"S{index}"
        file_name = document.get("file_name") or f"Document {document_id}"
        similarity = float(match.get("similarity") or 0)
        sources.append(f"[{source_marker}] {file_name}")
        context_blocks.append(
            f"[{source_marker}] File: {file_name}\n"
            f"Relevance: {similarity:.3f}\n"
            f"Excerpt:\n{match['chunk_text']}"
        )
    context = "\n\n---\n\n".join(context_blocks)
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
    memory: str = "",
) -> AsyncIterator[str]:
    answer_parts: list[str] = []
    yield f"event: sources\ndata: {json.dumps(sources)}\n\n"
    try:
        async for token in llm.stream_widget_answer(context=context, question=question, widget=widget, memory=memory):
            answer_parts.append(token)
            yield f"data: {json.dumps(token)}\n\n"
    except ExternalServiceError as exc:
        logger.warning("widget stream failed: %s %s", exc.service, exc.detail)
        yield f"event: error\ndata: {json.dumps(_generic_error())}\n\n"
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
        had_answer=_has_answer(answer, _widget_fallback_message(widget)),
    )
    yield "event: done\ndata: [DONE]\n\n"


async def _stream_and_save_answer(
    llm: LLMService,
    db: DatabaseService,
    user_id: str,
    payload: RagAnswerInput,
    sources: list[str],
) -> AsyncIterator[str]:
    answer_parts: list[str] = []
    yield f"event: sources\ndata: {json.dumps(sources)}\n\n"
    try:
        async for token in llm.stream_rag_answer(payload):
            answer_parts.append(token)
            yield f"data: {json.dumps(token)}\n\n"
    except ExternalServiceError as exc:
        logger.warning("playground stream failed: %s %s", exc.service, exc.detail)
        yield f"event: error\ndata: {json.dumps(_generic_error())}\n\n"
        return
    await db.insert_chat(user_id=user_id, message="".join(answer_parts).strip(), role="bot")
    yield "event: done\ndata: [DONE]\n\n"



@router.get("/widget-history/export")
async def widget_history_export(user_id: str = Query(...), format: str = Query(default="csv"), user: dict = Depends(get_current_user), db: DatabaseService = Depends(get_db)):
    rows = await db.get_widget_chats(user_id=user["workspace"], limit=800)
    rows = sorted(rows, key=lambda row: row.get("timestamp", ""))
    if format == "json":
        body = json.dumps(rows, indent=2, default=str)
        return StreamingResponse(iter([body]), media_type="application/json", headers={"Content-Disposition": "attachment; filename=widget-history.json"})
    import csv
    import io

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["timestamp", "visitor_id", "widget_id", "role", "message", "had_answer", "token_count", "latency_ms"])
    writer.writeheader()
    for row in rows:
        writer.writerow({field: row.get(field, "") for field in writer.fieldnames})
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=widget-history.csv"})


@router.get("/history", response_model=list[HistoryItem])
async def history(user_id: str = Query(...), user: dict = Depends(get_current_user), db: DatabaseService = Depends(get_db)) -> list[dict]:
    return await db.get_history(user_id=user["workspace"])


@router.get("/documents", response_model=list[DocumentItem])
async def documents(user_id: str = Query(...), limit: int = Query(default=100, ge=1, le=200), offset: int = Query(default=0, ge=0), user: dict = Depends(get_current_user), db: DatabaseService = Depends(get_db)) -> list[dict]:
    all_docs = await db.get_documents(user_id=user["workspace"])
    return all_docs[offset:offset + limit]


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: str,
    user_id: str = Query(...),
    user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db),
) -> None:
    await db.delete_document(user_id=user["workspace"], document_id=document_id)
