"""
Shared fixtures for the Obscura backend test suite.

Heavy / unavailable packages (supabase, paddleocr, paddlepaddle) are stubbed
via sys.modules before any backend code is imported, so the suite runs without
a full production environment.
"""
import sys
import base64
import io
import os
from unittest.mock import MagicMock

# ── Stub unavailable packages before any backend imports ─────────────────────
# supabase
_fake_supabase = MagicMock()
sys.modules.setdefault('supabase', _fake_supabase)

# paddleocr / paddlepaddle
sys.modules.setdefault('paddleocr', MagicMock())
sys.modules.setdefault('paddlepaddle', MagicMock())

# Now safe to import backend modules
import pytest
from PIL import Image


# ── Minimal valid JPEG base64 fixture ─────────────────────────────────────────

def _make_jpeg_b64(width: int = 200, height: int = 150, color=(200, 200, 200)) -> str:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


@pytest.fixture
def jpeg_b64():
    """A small valid JPEG image as base64."""
    return _make_jpeg_b64()


@pytest.fixture
def large_b64():
    """A base64 string that exceeds the 20 MB payload limit."""
    return "A" * (27 * 1024 * 1024 + 1)


# ── FastAPI test client ───────────────────────────────────────────────────────

@pytest.fixture
def client():
    """
    FastAPI test client with auth and external services fully mocked.
    - Anthropic and PaddleOCR are never called for real.
    - get_current_user is overridden to return a fake user.
    """
    os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
    os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
    os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "fake-key")

    from unittest.mock import patch
    from fastapi.testclient import TestClient

    fake_user = MagicMock()
    fake_user.id = "user-123"

    # Import app after stubs are in place
    import routers.generate as gen_module
    gen_module._paddle_available = False  # force Claude-only path

    from main import app
    from lib.auth import get_current_user, security
    from fastapi.security import HTTPAuthorizationCredentials

    app.dependency_overrides[security] = lambda: HTTPAuthorizationCredentials(
        scheme="Bearer", credentials="fake-token"
    )
    app.dependency_overrides[get_current_user] = lambda: fake_user
    yield TestClient(app)
    app.dependency_overrides.clear()


# ── Anthropic mock helpers ─────────────────────────────────────────────────────

def make_anthropic_response(text: str):
    """Return a mock Anthropic message with a single text block."""
    block = MagicMock()
    block.type = "text"
    block.text = text
    msg = MagicMock()
    msg.content = [block]
    return msg
