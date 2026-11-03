"""Final build tests. Run from backend/: python -m unittest tests.test_final -v
Covers the final-build changes only, no Supabase, no LLM, no network."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.routes import _format_widget_memory
from app.models.schemas import WidgetFeedbackRequest, RegenerateRequest
from app.services.pdf import extract_docx_text, extract_text_file
import inspect
from app.api import routes as routes_module


class TestWidgetMemory(unittest.TestCase):
    def test_memory_drops_current_and_keeps_last_turns(self):
        rows = [
            {"role": "user", "message": "What is Ragora?"},
            {"role": "bot", "message": "Ragora is a chatbot."},
            {"role": "user", "message": "Tell me more"},
        ]
        memory = _format_widget_memory(rows, "Tell me more")
        self.assertIn("What is Ragora?", memory)
        self.assertNotIn("Tell me more", memory.split("Visitor:")[-1] if "Visitor:" in memory else memory)

    def test_memory_empty(self):
        self.assertIn("No earlier", _format_widget_memory([], "hello"))


class TestFeedbackSchemas(unittest.TestCase):
    def test_rating_enum(self):
        ok = WidgetFeedbackRequest(visitor_id="v1", rating="helpful", bot_message="hi")
        self.assertEqual(ok.rating, "helpful")
        with self.assertRaises(Exception):
            WidgetFeedbackRequest(visitor_id="v1", rating="love")

    def test_regenerate(self):
        req = RegenerateRequest(visitor_id="v1", question="again?")
        self.assertEqual(req.question, "again?")


class TestTextExtraction(unittest.TestCase):
    def test_txt(self):
        self.assertEqual(extract_text_file(b"hello\nworld"), "hello\nworld")

    def test_docx_minimal(self):
        import zipfile, io
        xml = '''<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello DOCX</w:t></w:r></w:p></w:body></w:document>'''
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr("word/document.xml", xml)
        self.assertIn("Hello DOCX", extract_docx_text(buf.getvalue()))


class TestWidgetChatSignature(unittest.TestCase):
    def test_widget_chat_has_separate_http_and_body_params(self):
        # Regression test for the Phase A bug where the body parameter was
        # named "request" and shadowed the FastAPI Request, so rate limiting
        # and origin checks would crash on every widget chat.
        sig = inspect.signature(routes_module.widget_chat)
        params = sig.parameters
        self.assertIn("http_request", params)
        self.assertIn("payload", params)
        self.assertNotIn("request", params)


if __name__ == "__main__":
    unittest.main()
