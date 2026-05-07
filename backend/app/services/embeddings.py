import asyncio

import httpx

from app.core.config import Settings
from app.services.errors import ExternalServiceError


class EmbeddingService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url="https://api.mistral.ai/v1",
            headers={"Authorization": f"Bearer {settings.mistral_api_key}"},
            timeout=60,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def embed_texts(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        if not texts:
            return []

        batches = [texts[i : i + batch_size] for i in range(0, len(texts), batch_size)]
        results = await asyncio.gather(*(self._embed_batch(batch) for batch in batches))
        return [embedding for batch in results for embedding in batch]

    async def embed_query(self, text: str) -> list[float]:
        embeddings = await self.embed_texts([text], batch_size=1)
        return embeddings[0]

    async def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        response = await self._client.post(
            "/embeddings",
            json={"model": "mistral-embed", "input": texts},
        )
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ExternalServiceError(
                service="Mistral",
                status_code=exc.response.status_code,
                detail=exc.response.text,
            ) from exc
        payload = response.json()
        ordered = sorted(payload["data"], key=lambda item: item["index"])
        return [item["embedding"] for item in ordered]
