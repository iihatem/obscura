"""
T060 – Unit tests for the generate pipeline helpers.
T061 – Contract tests: POST /generate/labels and /generate/flashcards response shape.
T062 – Integration-style test: real image input → valid % coordinate labels returned.
"""
import json
import base64
import io
from unittest.mock import patch, MagicMock

import pytest
from PIL import Image

from tests.conftest import make_anthropic_response, _make_jpeg_b64


# ════════════════════════════════════════════════════════════════════════════
# T060 – Unit tests for pipeline helpers
# ════════════════════════════════════════════════════════════════════════════

class TestHelpers:
    def test_openai_fallback_converts_anthropic_image_blocks(self):
        from routers.generate import _openai_fallback

        openai_client = MagicMock()
        openai_client.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content='[{"label":"A","regions":[0]}]'))
        ]
        kwargs = {
            "system": "Return JSON",
            "max_tokens": 100,
            "messages": [{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": "abc"}},
                {"type": "text", "text": "OCR regions: []"},
            ]}],
        }

        with patch("routers.generate.get_openai", return_value=openai_client):
            message = _openai_fallback(kwargs, "gpt-5-mini")

        call = openai_client.chat.completions.create.call_args.kwargs
        assert call["model"] == "gpt-5-mini"
        assert call["max_completion_tokens"] == 100
        assert call["messages"][1]["content"][0]["image_url"]["url"] == "data:image/jpeg;base64,abc"
        assert message.content[0].text.startswith("[")

    def test_retries_rate_limit_with_openai(self, monkeypatch):
        import httpx
        from anthropic import RateLimitError
        from routers.generate import _create_message_with_fallback

        monkeypatch.delenv("ANTHROPIC_PRIMARY_MODEL", raising=False)
        monkeypatch.delenv("OPENAI_FALLBACK_MODEL", raising=False)
        response = httpx.Response(429, request=httpx.Request("POST", "https://api.anthropic.com/v1/messages"))
        error = RateLimitError("rate limited", response=response, body={})
        expected = make_anthropic_response("[]")
        client = MagicMock()
        client.messages.create.side_effect = error

        with patch("routers.generate._openai_fallback", return_value=expected) as fallback:
            message, model = _create_message_with_fallback(client, max_tokens=10, messages=[])

        assert message is expected
        assert model == "openai:gpt-5-mini"
        assert client.messages.create.call_args.kwargs["model"] == "claude-sonnet-4-6"
        assert fallback.call_args.args[1] == "gpt-5-mini"

    def test_detect_mime_jpeg(self):
        from routers.generate import _detect_mime
        b64 = _make_jpeg_b64()
        assert _detect_mime(b64) == "image/jpeg"

    def test_detect_mime_png(self):
        from routers.generate import _detect_mime
        import struct, zlib
        # Minimal 1×1 PNG
        def png_chunk(name, data):
            c = struct.pack(">I", len(data)) + name + data
            return c + struct.pack(">I", zlib.crc32(c[4:]) & 0xFFFFFFFF)
        raw = (b"\x89PNG\r\n\x1a\n"
               + png_chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
               + png_chunk(b"IDAT", zlib.compress(b"\x00\xff\xff\xff"))
               + png_chunk(b"IEND", b""))
        b64 = base64.b64encode(raw).decode()
        assert _detect_mime(b64) == "image/png"

    def test_strip_fences_removes_json_fence(self):
        from routers.generate import _strip_fences
        assert _strip_fences("```json\n[1,2]\n```") == "[1,2]"
        assert _strip_fences("[1,2]") == "[1,2]"

    def test_strip_fences_removes_plain_fence(self):
        from routers.generate import _strip_fences
        assert _strip_fences("```\n{}\n```") == "{}"

    def test_union_boxes(self):
        from routers.generate import _union_boxes
        boxes = [(10, 20, 30, 40), (5, 25, 35, 45)]
        assert _union_boxes(boxes) == (5, 20, 35, 45)

    def test_poly_to_bbox_basic(self):
        import numpy as np
        from routers.generate import _poly_to_bbox
        poly = np.array([[10, 20], [50, 20], [50, 40], [10, 40]], dtype=float)
        orig, padded = _poly_to_bbox(poly, img_w=200, img_h=100, pad=3)
        assert orig == (10, 20, 50, 40)
        assert padded == (7, 17, 53, 43)

    def test_poly_to_bbox_clamps_to_image(self):
        import numpy as np
        from routers.generate import _poly_to_bbox
        poly = np.array([[0, 0], [200, 0], [200, 100], [0, 100]], dtype=float)
        _, padded = _poly_to_bbox(poly, img_w=200, img_h=100, pad=5)
        assert padded[0] >= 0 and padded[1] >= 0
        assert padded[2] <= 200 and padded[3] <= 100

    def test_pil_to_b64_produces_valid_jpeg(self):
        from routers.generate import _pil_to_b64
        img = Image.new("RGB", (10, 10), color=(128, 128, 128))
        b64 = _pil_to_b64(img)
        raw = base64.b64decode(b64)
        assert raw[:2] == b"\xff\xd8"  # JPEG magic bytes


# ════════════════════════════════════════════════════════════════════════════
# T061 – Contract tests: response shape
# ════════════════════════════════════════════════════════════════════════════

class TestLabelsContract:
    """POST /generate/labels must return {labels: [...], croppedImageBase64: str}."""

    def test_returns_correct_shape(self, client, jpeg_b64):
        label_json = json.dumps([{"label": "Aorta", "x": 10, "y": 10, "width": 20, "height": 5}])

        with patch("routers.generate.get_anthropic") as mock_client_fn:
            mock_client = MagicMock()
            mock_client_fn.return_value = mock_client
            mock_client.messages.create.return_value = make_anthropic_response(label_json)

            resp = client.post("/generate/labels", json={"imageBase64": jpeg_b64, "setId": "set-1"})

        assert resp.status_code == 200
        body = resp.json()
        assert "labels" in body
        assert "croppedImageBase64" in body
        assert isinstance(body["labels"], list)
        assert isinstance(body["croppedImageBase64"], str)
        assert len(body["croppedImageBase64"]) > 0

    def test_label_has_required_fields(self, client, jpeg_b64):
        label_json = json.dumps([{"label": "Femur", "regions": [0]}])

        # Provide a minimal PaddleOCR result so Stage 1 runs
        fake_poly = [[10, 20], [80, 20], [80, 30], [10, 30]]
        fake_ocr_result = [{"dt_polys": [fake_poly], "rec_texts": ["Femur"], "rec_scores": [0.99]}]

        with patch("routers.generate.get_anthropic") as mock_client_fn, \
             patch("routers.generate.get_paddle_ocr") as mock_ocr_fn:
            mock_client = MagicMock()
            mock_client_fn.return_value = mock_client
            mock_client.messages.create.return_value = make_anthropic_response(label_json)
            mock_ocr = MagicMock()
            mock_ocr.predict.return_value = iter(fake_ocr_result)
            mock_ocr_fn.return_value = mock_ocr

            resp = client.post("/generate/labels", json={"imageBase64": jpeg_b64, "setId": "set-1"})

        assert resp.status_code == 200
        labels = resp.json()["labels"]
        assert len(labels) == 1
        lbl = labels[0]
        for field in ("label", "x", "y", "width", "height"):
            assert field in lbl, f"Missing field: {field}"

    def test_rejects_oversized_payload(self, client, large_b64):
        resp = client.post("/generate/labels", json={"imageBase64": large_b64, "setId": "set-1"})
        assert resp.status_code == 400
        assert "too large" in resp.json()["detail"].lower()

    def test_requires_image_and_set_id(self, client):
        resp = client.post("/generate/labels", json={"imageBase64": "", "setId": ""})
        assert resp.status_code == 400

    def test_fallback_when_no_ocr_boxes(self, client, jpeg_b64):
        """When PaddleOCR returns 0 boxes, falls back to Claude full-image detection."""
        fallback_labels = json.dumps([
            {"label": "Tibia", "x": 10.0, "y": 20.0, "width": 15.0, "height": 5.0}
        ])

        with patch("routers.generate.get_anthropic") as mock_client_fn:
            mock_client = MagicMock()
            mock_client_fn.return_value = mock_client
            mock_client.messages.create.return_value = make_anthropic_response(fallback_labels)

            resp = client.post("/generate/labels", json={"imageBase64": jpeg_b64, "setId": "set-1"})

        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body["labels"], list)


class TestFlashcardsContract:
    """POST /generate/flashcards must return {cards: [{front, back}]}."""

    def test_returns_correct_shape(self, client, jpeg_b64):
        cards_json = json.dumps([{"front": "What is the mitral valve?", "back": "Left AV valve"}])

        with patch("routers.generate.get_anthropic") as mock_client_fn:
            mock_client = MagicMock()
            mock_client_fn.return_value = mock_client
            mock_client.messages.create.return_value = make_anthropic_response(cards_json)

            resp = client.post("/generate/flashcards", json={"imageBase64": jpeg_b64, "setId": "set-1"})

        assert resp.status_code == 200
        body = resp.json()
        assert "cards" in body
        assert isinstance(body["cards"], list)
        assert body["cards"][0]["front"] == "What is the mitral valve?"
        assert body["cards"][0]["back"] == "Left AV valve"

    def test_rejects_oversized_payload(self, client, large_b64):
        resp = client.post("/generate/flashcards", json={"imageBase64": large_b64, "setId": "set-1"})
        assert resp.status_code == 400

    def test_uses_extracted_text_without_sending_image(self, client, jpeg_b64):
        cards_json = json.dumps([{"front": "Question?", "back": "Answer"}])
        extracted = "Useful lecture content about anatomy and physiology. " * 4

        with patch("routers.generate.get_anthropic") as mock_client_fn:
            mock_client = MagicMock()
            mock_client_fn.return_value = mock_client
            mock_client.messages.create.return_value = make_anthropic_response(cards_json)
            resp = client.post("/generate/flashcards", json={
                "imageBase64": jpeg_b64, "setId": "set-1", "extractedText": extracted,
            })

        assert resp.status_code == 200
        assert resp.json()["source"] == "text"
        content = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
        assert isinstance(content, str)
        assert extracted.strip() in content


# ════════════════════════════════════════════════════════════════════════════
# T062 – Coordinate validity: labels must be 0–100 % and non-degenerate
# ════════════════════════════════════════════════════════════════════════════

class TestCoordinateValidity:
    """
    Ensure that whatever labels come back from the pipeline have
    valid percentage coordinates (0–100) and positive dimensions.
    """

    def test_label_coordinates_are_valid_percentages(self, client, jpeg_b64):
        fake_poly = [[10, 20], [80, 20], [80, 30], [10, 30]]
        fake_ocr_result = [{"dt_polys": [fake_poly], "rec_texts": ["Humerus"], "rec_scores": [0.99]}]
        label_json = json.dumps([{"label": "Humerus", "regions": [0]}])

        with patch("routers.generate.get_anthropic") as mock_client_fn, \
             patch("routers.generate.get_paddle_ocr") as mock_ocr_fn:
            mock_client = MagicMock()
            mock_client_fn.return_value = mock_client
            mock_client.messages.create.return_value = make_anthropic_response(label_json)
            mock_ocr = MagicMock()
            mock_ocr.predict.return_value = iter(fake_ocr_result)
            mock_ocr_fn.return_value = mock_ocr

            resp = client.post("/generate/labels", json={"imageBase64": jpeg_b64, "setId": "set-1"})

        assert resp.status_code == 200
        for lbl in resp.json()["labels"]:
            assert 0 <= lbl["x"] <= 100, f"x out of range: {lbl['x']}"
            assert 0 <= lbl["y"] <= 100, f"y out of range: {lbl['y']}"
            assert lbl["width"] > 0,     f"width not positive: {lbl['width']}"
            assert lbl["height"] > 0,    f"height not positive: {lbl['height']}"
            assert lbl["x"] + lbl["width"] <= 100 + 1e-3   # allow float rounding
            assert lbl["y"] + lbl["height"] <= 100 + 1e-3
