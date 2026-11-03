"""In-memory sliding-window rate limiter for Phase A.

No new dependency. This is per-process, so it bounds abuse on a single
instance (the current Railway/Render deploy) but it is not a substitute for
a shared Redis limiter when Ragora runs multiple instances. Limits are
deliberately generous for normal use and tight for auth and public chat,
where each request costs an LLM call.

Usage in routes:
    check_rate_limit(request, key="widget-chat", scope=widget_id, limit=300, window_seconds=60)
    check_rate_limit(request, key="auth", scope=client_ip, limit=10, window_seconds=60)

Raises HTTPException 429 with a Retry-After header. The key is never a
secret, only an IP, widget id, or workspace slug.
"""
import time
from collections import deque

from fastapi import HTTPException, Request

_windows: dict[str, deque[float]] = {}


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


def check_rate_limit(
    request: Request,
    key: str,
    scope: str,
    limit: int,
    window_seconds: int = 60,
) -> None:
    now = time.monotonic()
    bucket_key = f"{key}:{scope}"
    window = _windows.setdefault(bucket_key, deque())
    while window and window[0] <= now - window_seconds:
        window.popleft()
    if len(window) >= limit:
        retry_after = int(window[0] + window_seconds - now) + 1
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a moment and try again.",
            headers={"Retry-After": str(retry_after)},
        )
    window.append(now)
    # Prevent unbounded growth from many distinct scopes (for example, many
    # visitor ids). Keep the most recent buckets only.
    if len(_windows) > 10000:
        oldest = sorted(_windows, key=lambda k: _windows[k][0] if _windows[k] else 0)[:1000]
        for k in oldest:
            _windows.pop(k, None)


def rate_limit_ip(request: Request, key: str, limit: int, window_seconds: int = 60) -> None:
    check_rate_limit(request, key, _client_ip(request), limit, window_seconds)


def reset_rate_limits() -> None:
    """Only for tests. Never call from a request handler."""
    _windows.clear()
