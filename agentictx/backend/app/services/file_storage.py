import base64
import mimetypes
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings


def _upload_root() -> Path:
    root = Path(settings.upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


async def save_upload(file: UploadFile, use_case_id: str) -> dict:
    """Save uploaded file to disk and return metadata dict."""
    use_case_dir = _upload_root() / use_case_id
    use_case_dir.mkdir(parents=True, exist_ok=True)

    # Preserve extension, add unique prefix to avoid collisions
    original = file.filename or "upload"
    ext = Path(original).suffix
    file_name = f"{uuid.uuid4().hex}{ext}"
    file_path = use_case_dir / file_name

    content = await file.read()
    file_path.write_bytes(content)

    mime_type = file.content_type or mimetypes.guess_type(original)[0] or "application/octet-stream"

    return {
        "file_path": str(file_path),
        "file_name": original,
        "mime_type": mime_type,
    }


async def extract_text(file_path: str, mime_type: str) -> str:
    """Extract plain text from PDF, DOCX, or text files."""
    path = Path(file_path)

    if mime_type == "application/pdf" or path.suffix.lower() == ".pdf":
        return _extract_pdf(path)

    if (
        mime_type
        == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        or path.suffix.lower() == ".docx"
    ):
        return _extract_docx(path)

    # Plain text fallback
    return path.read_text(encoding="utf-8", errors="replace")


def _extract_pdf(path: Path) -> str:
    import fitz  # PyMuPDF

    doc = fitz.open(str(path))
    pages = [page.get_text() for page in doc]
    doc.close()
    return "\n\n".join(pages)


def _extract_docx(path: Path) -> str:
    from docx import Document

    doc = Document(str(path))
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip())


async def read_as_base64(file_path: str) -> str:
    """Read file bytes and return base64-encoded string."""
    data = Path(file_path).read_bytes()
    return base64.standard_b64encode(data).decode("ascii")


def is_image_mime(mime_type: str) -> bool:
    return mime_type.startswith("image/")
