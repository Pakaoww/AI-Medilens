import os
import base64
import logging
from pathlib import Path
from openai import OpenAI


class OCRService:
    """OCR via Typhoon OCR API. Falls back to PyMuPDF text layer for PDFs."""

    def __init__(self):
        self.api_key = os.getenv("TYPHOON_API_KEY")
        self.model = os.getenv("TYPHOON_OCR_MODEL", "typhoon-ocr-v1.5")
        self._client = None

    @property
    def client(self) -> OpenAI:
        if self._client is None and self.api_key:
            self._client = OpenAI(
                api_key=self.api_key,
                base_url="https://api.opentyphoon.ai/v1",
            )
        return self._client

    def _ocr_image_bytes(self, img_bytes: bytes, mime: str = "image/jpeg") -> str:
        b64 = base64.b64encode(img_bytes).decode()
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{b64}"},
                        },
                        {
                            "type": "text",
                            "text": (
                                "Extract all text from this medical lab report image. "
                                "Return only the raw extracted text, preserving numbers and units. "
                                "Do not interpret or summarize."
                            ),
                        },
                    ],
                }
            ],
            max_tokens=2000,
        )
        import re
        text = resp.choices[0].message.content or ""
        # Strip Typhoon OCR header like "**OCR Detected Words:** "
        text = re.sub(r"^\*\*OCR[^:]*:\*\*\s*", "", text).strip()
        return text

    def extract_from_pdf(self, pdf_bytes: bytes) -> str:
        import fitz

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        # Try native text layer first (fast, no API call needed)
        raw = "".join(page.get_text() for page in doc)
        if len(raw.strip()) >= 50:
            doc.close()
            return raw.strip()

        # Scanned PDF — render each page and OCR via Typhoon
        texts = []
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            texts.append(self._ocr_image_bytes(pix.tobytes("png"), "image/png"))
        doc.close()
        return "\n".join(texts).strip()

    def extract_text(self, file_bytes: bytes, filename: str) -> str:
        ext = Path(filename).suffix.lower()
        if ext == ".pdf":
            return self.extract_from_pdf(file_bytes)

        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}
        return self._ocr_image_bytes(file_bytes, mime_map.get(ext, "image/jpeg"))
