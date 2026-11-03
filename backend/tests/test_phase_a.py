"""Phase A tests. Run from backend/: python -m unittest tests.test_phase_a -v
No Supabase, no LLM, no network. Covers only the Phase A security changes."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException, Request
from pydantic import ValidationError

from app.core.config import Settings
from app.models.schemas import (
    ChatRequest,
    SignupResponse,
    WidgetChatRequest,
    WidgetConfigRequest,
    _clean_allowed_domains,
)
from app.services.auth import (
    create_password_reset_token,
    hash_password,
    verify_password_reset_token,
)
from app.services.rate_limit import check_rate_limit, reset_rate_limits


def _fake_request(ip="127.0.0.1", origin=""):
    scope = {"type": "http", "headers": []}
    if origin:
        scope["headers"] = [(b"origin", origin.encode())]
    request = Request(scope)
    request._client = type("C", (), {"host": ip})()  # type: ignore[attr-defined]
    # Request.client reads from scope; set it directly for the limiter test.
    request.scope["client"] = (ip, 12345)
    return request


class TestRateLimit(unittest.TestCase):
    def setUp(self):
        reset_rate_limits()

    def test_allows_up_to_limit_then_429(self):
        req = _fake_request()
        for _ in range(3):
            check_rate_limit(req, "test", "scope-a", limit=3, window_seconds=60)
        with self.assertRaises(HTTPException) as ctx:
            check_rate_limit(req, "test", "scope-a", limit=3, window_seconds=60)
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("Retry-After", ctx.exception.headers or {})

    def test_different_scopes_do_not_share_limit(self):
        req = _fake_request()
        check_rate_limit(req, "test", "scope-a", limit=1, window_seconds=60)
        check_rate_limit(req, "test", "scope-b", limit=1, window_seconds=60)


class TestResetToken(unittest.TestCase):
    def setUp(self):
        self.settings = Settings(
            supabase_url="https://example.supabase.co",
            supabase_service_role_key="test",
            mistral_api_key="test",
            groq_api_key="test",
            jwt_secret="test-secret-for-unit-tests-only",
        )
        self.user = {
            "email": "owner@example.com",
            "password_hash": hash_password("old-password-123"),
        }

    def test_token_verifies_then_fails_after_password_change(self):
        token = create_password_reset_token(self.user, self.settings, minutes=60)
        self.assertTrue(verify_password_reset_token(token, self.user, self.settings))
        changed = {**self.user, "password_hash": hash_password("new-password-123")}
        self.assertFalse(verify_password_reset_token(token, changed, self.settings))

    def test_expired_token_fails(self):
        token = create_password_reset_token(self.user, self.settings, minutes=-1)
        self.assertFalse(verify_password_reset_token(token, self.user, self.settings))

    def test_tampered_token_fails(self):
        token = create_password_reset_token(self.user, self.settings, minutes=60)
        tampered = token[:-2] + ("AA" if not token.endswith("AA") else "BB")
        self.assertFalse(verify_password_reset_token(tampered, self.user, self.settings))


class TestSchemas(unittest.TestCase):
    def test_widget_message_cap(self):
        with self.assertRaises(ValidationError):
            WidgetChatRequest(message="x" * 2001, visitor_id="v1")
        ok = WidgetChatRequest(message="hello", visitor_id="v1")
        self.assertEqual(ok.message, "hello")

    def test_chat_message_cap(self):
        with self.assertRaises(ValidationError):
            ChatRequest(user_id="ws", message="x" * 4001)

    def test_allowed_domains_cleaning(self):
        self.assertEqual(
            _clean_allowed_domains(["https://Example.com/", " shop.example.com ", "", "example.com"]),
            ["example.com", "shop.example.com"],
        )
        req = WidgetConfigRequest(user_id="ws", allowed_domains=["HTTPS://Example.COM"])
        self.assertEqual(req.allowed_domains, ["example.com"])

    def test_signup_response_has_no_tokens(self):
        resp = SignupResponse(email="a@example.com", message="Check your email.")
        self.assertTrue(resp.verification_required)
        self.assertFalse(hasattr(resp, "access_token"))


class TestAllowedOrigin(unittest.TestCase):
    def test_allowed_origin_logic(self):
        # Import here so a routes import failure does not hide the other tests.
        from app.api.routes import _allowed_origin

        widget = {"allowed_domains": ["example.com"]}
        self.assertTrue(_allowed_origin(widget, _fake_request(origin="https://example.com")))
        self.assertTrue(_allowed_origin(widget, _fake_request(origin="https://shop.example.com")))
        self.assertFalse(_allowed_origin(widget, _fake_request(origin="https://evil.com")))
        self.assertTrue(_allowed_origin({"allowed_domains": []}, _fake_request(origin="https://evil.com")))
        self.assertTrue(_allowed_origin(widget, _fake_request(origin="")))


if __name__ == "__main__":
    unittest.main()
