from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    mistral_api_key: str
    groq_api_key: str
    groq_model: str = "llama3-8b-8192"
    groq_fallback_model: str = "llama-3.1-8b-instant"
    frontend_origin: str = "http://localhost:3000"
    allowed_origins: str = "*"
    chunk_size: int = 1100
    chunk_overlap: int = 160
    embedding_dimension: int = 1024
    retrieval_match_count: int = 12
    retrieval_context_count: int = 6
    retrieval_min_similarity: float = 0.22
    jwt_secret: str  # Required. No default on purpose: a default JWT secret lets anyone forge tokens.
    access_token_minutes: int = 45
    refresh_token_days: int = 30
    google_client_id: str = ""
    admin_emails: str = ""
    bootstrap_admin_email: str = ""  # Only bootstrapped when both email and password are set.
    bootstrap_admin_password: str = ""  # Required with bootstrap_admin_email. No default on purpose.
    key_rotation_cache_seconds: int = 30
    widget_asset_bucket: str = "ragora-widget-assets"
    email_verification_minutes: int = 10
    password_reset_minutes: int = 60
    max_pdf_bytes: int = 20_000_000
    max_pdf_pages: int = 200
    max_widget_message_chars: int = 2000
    max_chat_message_chars: int = 4000
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "Ragora"
    smtp_use_tls: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
