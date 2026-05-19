import os
import sys
import logging
import traceback
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)

from ocr_service import OCRService
from typhoon_service import TyphoonService

load_dotenv()

# ── Paths ──
ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "index.html"

# ── App ──
app = FastAPI(title="MediLens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Services (lazy init to keep startup fast) ──
ocr: OCRService | None = None
typhoon: TyphoonService | None = None


def get_ocr() -> OCRService:
    global ocr
    if ocr is None:
        ocr = OCRService()
    return ocr


def get_typhoon() -> TyphoonService:
    global typhoon
    if typhoon is None:
        typhoon = TyphoonService()
    return typhoon


# ── Schemas ──
class AnalyzeRequest(BaseModel):
    ocr_text: str


class ChatRequest(BaseModel):
    question: str
    context: str = ""


# ── Routes ──
@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    if FRONTEND.exists():
        return HTMLResponse(FRONTEND.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>MediLens — frontend not found</h1>")


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in {".pdf", ".png", ".jpg", ".jpeg"}:
        raise HTTPException(400, "Unsupported file type. Use PDF, PNG, or JPG.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 10 MB limit.")

    try:
        text = get_ocr().extract_text(contents, file.filename)
    except Exception as e:
        logging.error("OCR failed: %s\n%s", e, traceback.format_exc())
        raise HTTPException(500, f"OCR processing failed: {e}")

    return {
        "success": True,
        "ocr_text": text,
        "filename": file.filename,
    }


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    if not req.ocr_text.strip():
        raise HTTPException(400, "OCR text is empty")

    result = get_typhoon().analyze(req.ocr_text)
    return {"success": True, **result}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(400, "Question is empty")

    answer = get_typhoon().chat(req.question, req.context)
    return {"success": True, "response": answer}


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "typhoon_available": get_typhoon().is_available(),
        "ocr_loaded": ocr is not None and ocr._reader is not None,
    }


# ── Entry point ──
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
