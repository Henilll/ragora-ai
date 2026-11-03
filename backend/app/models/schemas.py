from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


def _clean_suggested_questions(value: object) -> list[str]:
    """Owner-entered welcome chips: strip, drop empties, cap at 4, cap length.

    Runs on both the builder request and the stored config, so a widget can
    never show a blank chip or a wall of chips, even if an old row or a
    direct API call sends more.
    """
    if value is None:
        return []
    if isinstance(value, str):
        value = value.split("\n")
    if not isinstance(value, list):
        return []
    cleaned: list[str] = []
    for item in value:
        text = str(item).strip()
        if text:
            cleaned.append(text[:140])
        if len(cleaned) >= 4:
            break
    return cleaned


class AuthUser(BaseModel):
    id: str
    email: str
    name: str
    workspace: str
    provider: str
    avatar_url: str = ""
    email_verified: bool
    is_admin: bool = False


class AdminApiKeyCreate(BaseModel):
    service: Literal["groq", "mistral"]
    name: str = Field(min_length=2)
    key_value: str = Field(min_length=10)
    weight: int = Field(default=1, ge=1, le=100)
    is_enabled: bool = True


class AdminApiKeyUpdate(BaseModel):
    name: str | None = None
    key_value: str | None = None
    weight: int | None = Field(default=None, ge=1, le=100)
    is_enabled: bool | None = None


class AdminApiKey(BaseModel):
    id: str
    service: Literal["groq", "mistral"]
    name: str
    key_value: str
    is_enabled: bool
    weight: int
    usage_count: int
    failure_count: int
    last_used_at: datetime | None = None
    last_error: str = ""
    created_at: datetime


class AdminOverview(BaseModel):
    users: int
    admins: int
    documents: int
    ready_documents: int
    processing_documents: int
    failed_documents: int
    chunks: int
    chats: int
    widgets: int
    live_widgets: int
    widget_messages: int
    api_keys: int
    enabled_api_keys: int


class SignupResponse(BaseModel):
    email: str
    verification_required: bool = True
    message: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUser


class SignupRequest(BaseModel):
    name: str = Field(min_length=2)
    email: str = Field(min_length=5)
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5)
    password: str = Field(min_length=1)


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(min_length=20)


class SupabaseAuthRequest(BaseModel):
    access_token: str = Field(min_length=20)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=5)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=6)
    password: str = Field(min_length=8)


class VerifyEmailRequest(BaseModel):
    email: str = Field(min_length=5)
    code: str = Field(min_length=6, max_length=6)


class StatusResponse(BaseModel):
    ok: bool
    message: str


class ChatRequest(BaseModel):
    user_id: str = Field(min_length=1)
    message: str = Field(min_length=1, max_length=4000)
    stream: bool = False


class WidgetChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    visitor_id: str = Field(min_length=1, max_length=128)
    stream: bool = False


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]


class HistoryItem(BaseModel):
    id: str
    user_id: str
    message: str
    role: Literal["user", "bot"]
    timestamp: datetime


class DocumentItem(BaseModel):
    id: str
    user_id: str
    file_name: str
    file_hash: str = ""
    status: str = "ready"
    chunk_count: int
    created_at: datetime


class UploadResponse(BaseModel):
    document_id: str
    file_name: str
    chunk_count: int
    status: str = "processing"


def _clean_allowed_domains(value: object) -> list[str]:
    if isinstance(value, str):
        parts = value.splitlines()
    elif isinstance(value, list):
        parts = [str(item) for item in value]
    else:
        return []
    cleaned: list[str] = []
    for part in parts:
        domain = part.strip().lower()
        for prefix in ("https://", "http://"):
            if domain.startswith(prefix):
                domain = domain[len(prefix):]
        domain = domain.strip("/").split("/")[0]
        if domain and domain not in cleaned:
            cleaned.append(domain)
    return cleaned[:20]


class WidgetConfigRequest(BaseModel):
    user_id: str = Field(min_length=1)
    title: str = "Ask AI"
    welcome_message: str = "Hi. Ask me anything from these documents."
    suggested_questions: list[str] = []
    allowed_domains: list[str] = []
    chat_model: str = ""

    @field_validator("suggested_questions", mode="before")
    @classmethod
    def _validate_suggested_questions(cls, value: object) -> list[str]:
        return _clean_suggested_questions(value)

    @field_validator("allowed_domains", mode="before")
    @classmethod
    def _validate_allowed_domains(cls, value: object) -> list[str]:
        return _clean_allowed_domains(value)
    theme: Literal["dark", "light"] = "dark"
    accent_color: str = "#38bdf8"
    secondary_color: str = "#0f172a"
    logo_url: str = ""
    icon_label: str = "AI"
    company_name: str = ""
    company_site: str = ""
    company_email: str = ""
    launcher_style: Literal["pill", "circle"] = "pill"
    launcher_circle_size: int = Field(default=60, ge=44, le=96)
    launcher_pill_size: int = Field(default=56, ge=44, le=80)
    border_radius: int = 14
    launcher_label: str = "Chat with AI"
    input_placeholder: str = "Ask a question"
    position: Literal["bottom-right", "bottom-left"] = "bottom-right"
    bot_goal: str = "Answer visitor questions using the uploaded documents."
    bot_role: str = "customer_support"
    tone: str = "professional"
    custom_instructions: str = ""
    fallback_message: str = "I do not know based on the provided documents."
    collect_leads: bool = False
    is_enabled: bool = True


class WidgetConfig(BaseModel):
    widget_id: str
    user_id: str
    title: str
    welcome_message: str
    suggested_questions: list[str] = []
    allowed_domains: list[str] = []
    chat_model: str = ""

    @field_validator("suggested_questions", mode="before")
    @classmethod
    def _validate_suggested_questions(cls, value: object) -> list[str]:
        return _clean_suggested_questions(value)

    @field_validator("allowed_domains", mode="before")
    @classmethod
    def _validate_allowed_domains(cls, value: object) -> list[str]:
        return _clean_allowed_domains(value)
    theme: Literal["dark", "light"]
    accent_color: str
    secondary_color: str
    logo_url: str
    icon_label: str
    company_name: str = ""
    company_site: str = ""
    company_email: str = ""
    launcher_style: Literal["pill", "circle"]
    launcher_circle_size: int = 60
    launcher_pill_size: int = 56
    border_radius: int
    launcher_label: str
    input_placeholder: str
    position: Literal["bottom-right", "bottom-left"]
    bot_goal: str
    bot_role: str
    tone: str
    custom_instructions: str
    fallback_message: str
    collect_leads: bool
    is_enabled: bool
    embed_script: str | None = None


class WidgetAnalytics(BaseModel):
    total_messages: int
    user_messages: int
    bot_messages: int
    unique_visitors: int
    unanswered_count: int
    total_tokens: int
    average_latency_ms: int
    top_questions: list[dict]
    unanswered_questions: list[dict]
    daily_messages: list[dict]
    feedback_helpful: int = 0
    feedback_not_helpful: int = 0


class WidgetHistory(BaseModel):
    conversations: list[dict]


class WidgetFeedbackRequest(BaseModel):
    visitor_id: str = Field(min_length=1, max_length=128)
    rating: Literal["helpful", "not_helpful"]
    bot_message: str = Field(default="", max_length=2000)
    question: str = Field(default="", max_length=2000)


class RegenerateRequest(BaseModel):
    visitor_id: str = Field(min_length=1, max_length=128)
    question: str = Field(min_length=1, max_length=2000)
