import os
import io
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image


class OCRService:
    """OCR service using EasyOCR for Thai + English text extraction.
    Falls back to PyMuPDF for text extraction from PDFs.
    """

    def __init__(self):
        self._reader = None

    @property
    def reader(self):
        if self._reader is None:
            import easyocr
            self._reader = easyocr.Reader(["th", "en"], gpu=False)
        return self._reader

    def extract_from_image(self, img_bytes: bytes) -> str:
        img = Image.open(io.BytesIO(img_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")

        arr = np.array(img)
        results = self.reader.readtext(arr)
        lines = [r[1] for r in results]
        return "\n".join(lines)

    def extract_from_pdf(self, pdf_bytes: bytes) -> str:
        import fitz

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        raw_text = "".join(page.get_text() for page in doc)

        # If direct text extraction yields very little, render pages and OCR
        if len(raw_text.strip()) < 50:
            raw_text = ""
            for page in doc:
                pix = page.get_pixmap(dpi=200)
                raw_text += self.extract_from_image(pix.tobytes("png")) + "\n"

        doc.close()
        return raw_text.strip()

    def extract_text(self, file_bytes: bytes, filename: str) -> str:
        ext = Path(filename).suffix.lower()
        if ext == ".pdf":
            return self.extract_from_pdf(file_bytes)
        return self.extract_from_image(file_bytes)
