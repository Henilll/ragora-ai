from uuid import uuid4
import secrets

import httpx

from app.core.config import Settings
from app.services.errors import ExternalServiceError


def _vector_literal(values: list[float]) -> str:
    return "[" + ",".join(str(value) for value in values) + "]"


class DatabaseService:
    def __init__(self, settings: Settings) -> None:
        self._client = httpx.AsyncClient(
            base_url=f"{settings.supabase_url.rstrip('/')}/rest/v1",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            timeout=60,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def create_document(self, user_id: str, file_name: str) -> str:
        document_id = str(uuid4())
        await self._request(
            "POST",
            "documents",
            json={"id": document_id, "user_id": user_id, "file_name": file_name, "chunk_count": 0},
        )
        return document_id

    async def update_document_chunk_count(self, document_id: str, chunk_count: int) -> None:
        await self._request("PATCH", "documents", params={"id": f"eq.{document_id}"}, json={"chunk_count": chunk_count})

    async def insert_chunks(
        self,
        user_id: str,
        document_id: str,
        chunks: list[str],
        embeddings: list[list[float]],
    ) -> None:
        rows = [
            {
                "user_id": user_id,
                "document_id": document_id,
                "chunk_text": chunk,
                "embedding": _vector_literal(embedding),
            }
            for chunk, embedding in zip(chunks, embeddings, strict=True)
        ]
        if rows:
            await self._request("POST", "document_chunks", json=rows)

    async def match_chunks(self, user_id: str, embedding: list[float], top_k: int = 5) -> list[dict]:
        response = await self._request(
            "POST",
            "rpc/match_document_chunks",
            json={"query_embedding": _vector_literal(embedding), "match_user_id": user_id, "match_count": top_k},
        )
        return response.json()

    async def insert_chat(self, user_id: str, message: str, role: str) -> None:
        await self._request("POST", "chats", json={"user_id": user_id, "message": message, "role": role})

    async def insert_widget_chat(
        self,
        widget_id: str,
        owner_user_id: str,
        visitor_id: str,
        message: str,
        role: str,
        token_count: int = 0,
        latency_ms: int | None = None,
        had_answer: bool | None = None,
    ) -> None:
        await self._request(
            "POST",
            "widget_chats",
            json={
                "widget_id": widget_id,
                "owner_user_id": owner_user_id,
                "visitor_id": visitor_id,
                "message": message,
                "role": role,
                "token_count": token_count,
                "latency_ms": latency_ms,
                "had_answer": had_answer,
            },
        )

    async def get_history(self, user_id: str) -> list[dict]:
        response = await self._request(
            "GET",
            "chats",
            params={"select": "*", "user_id": f"eq.{user_id}", "order": "timestamp.asc"},
        )
        return response.json()

    async def get_documents(self, user_id: str) -> list[dict]:
        response = await self._request(
            "GET",
            "documents",
            params={"select": "*", "user_id": f"eq.{user_id}", "order": "created_at.desc"},
        )
        return response.json()

    async def upsert_widget(self, config: dict) -> dict:
        existing = await self.get_widget_for_user(config["user_id"])
        payload = {
            "title": config["title"],
            "welcome_message": config["welcome_message"],
            "theme": config["theme"],
            "accent_color": config["accent_color"],
            "secondary_color": config["secondary_color"],
            "logo_url": config["logo_url"],
            "icon_label": config["icon_label"],
            "launcher_style": config["launcher_style"],
            "border_radius": config["border_radius"],
            "launcher_label": config["launcher_label"],
            "input_placeholder": config["input_placeholder"],
            "position": config["position"],
            "bot_goal": config["bot_goal"],
            "bot_role": config["bot_role"],
            "tone": config["tone"],
            "custom_instructions": config["custom_instructions"],
            "fallback_message": config["fallback_message"],
            "collect_leads": config["collect_leads"],
            "is_enabled": config["is_enabled"],
        }

        if existing:
            response = await self._request(
                "PATCH",
                "chat_widgets",
                params={"widget_id": f"eq.{existing['widget_id']}"},
                json=payload,
            )
            return response.json()[0]

        widget_id = f"w_{secrets.token_urlsafe(18).replace('-', '').replace('_', '')[:20]}"
        response = await self._request(
            "POST",
            "chat_widgets",
            json={"widget_id": widget_id, "user_id": config["user_id"], **payload},
        )
        return response.json()[0]

    async def get_widget_for_user(self, user_id: str) -> dict | None:
        response = await self._request(
            "GET",
            "chat_widgets",
            params={"select": "*", "user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": "1"},
        )
        rows = response.json()
        return rows[0] if rows else None

    async def get_widget_chats(self, user_id: str, limit: int = 500) -> list[dict]:
        response = await self._request(
            "GET",
            "widget_chats",
            params={
                "select": "*",
                "owner_user_id": f"eq.{user_id}",
                "order": "timestamp.desc",
                "limit": str(limit),
            },
        )
        return response.json()

    async def get_widget(self, widget_id: str) -> dict | None:
        response = await self._request(
            "GET",
            "chat_widgets",
            params={"select": "*", "widget_id": f"eq.{widget_id}", "is_enabled": "eq.true", "limit": "1"},
        )
        rows = response.json()
        return rows[0] if rows else None

    async def delete_document(self, user_id: str, document_id: str) -> None:
        await self._request(
            "DELETE",
            "document_chunks",
            params={"user_id": f"eq.{user_id}", "document_id": f"eq.{document_id}"},
        )
        await self._request(
            "DELETE",
            "documents",
            params={"user_id": f"eq.{user_id}", "id": f"eq.{document_id}"},
        )

    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        response = await self._client.request(method, path, **kwargs)
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ExternalServiceError(
                service="Supabase",
                status_code=exc.response.status_code,
                detail=exc.response.text,
            ) from exc
        return response
