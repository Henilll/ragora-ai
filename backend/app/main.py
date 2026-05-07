from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.services.db import DatabaseService
from app.services.embeddings import EmbeddingService
from app.services.llm import LLMService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.db = DatabaseService(settings)
    app.state.embeddings = EmbeddingService(settings)
    app.state.llm = LLMService(settings)
    yield
    await app.state.db.close()
    await app.state.embeddings.close()
    await app.state.llm.close()


app = FastAPI(title="PDF RAG API", version="1.0.0", lifespan=lifespan)
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.allowed_origins == "*" else [origin.strip() for origin in settings.allowed_origins.split(",")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
