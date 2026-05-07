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
    chunk_size: int = 800
    chunk_overlap: int = 50
    embedding_dimension: int = 1024

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
