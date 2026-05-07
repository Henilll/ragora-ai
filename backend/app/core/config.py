from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    mistral_api_key: str
    groq_api_key: str
    groq_model: str = "llama3-8b-8192"
    frontend_origin: str = "http://localhost:3000"
    allowed_origins: str = "*"
    chunk_size: int = 1100
    chunk_overlap: int = 160
    embedding_dimension: int = 1024
    retrieval_match_count: int = 12
    retrieval_context_count: int = 6
    retrieval_min_similarity: float = 0.22
    jwt_secret: str = "change-me-in-production"
    access_token_minutes: int = 45
    refresh_token_days: int = 30
    google_client_id: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
