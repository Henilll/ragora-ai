from io import BytesIO

from pypdf import PdfReader


def extract_pdf_text(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages).strip()


def extract_pdf_text_and_page_count(file_bytes: bytes) -> tuple[str, int]:
    reader = PdfReader(BytesIO(file_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages).strip(), len(reader.pages)


def extract_text_file(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="replace").strip()


def extract_docx_text(file_bytes: bytes) -> str:
    """Minimal DOCX text extraction using only stdlib (zip + xml)."""
    import xml.etree.ElementTree as ET
    import zipfile

    with zipfile.ZipFile(BytesIO(file_bytes)) as archive:
        xml_text = archive.read("word/document.xml")
    root = ET.fromstring(xml_text)
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs = []
    for paragraph in root.findall(".//w:p", namespace):
        texts = [node.text or "" for node in paragraph.findall(".//w:t", namespace)]
        paragraphs.append("".join(texts))
    return "\n".join(paragraphs).strip()
