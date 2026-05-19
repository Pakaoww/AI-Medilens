import os
import json
import re
import logging
from openai import OpenAI


ANALYZE_SYSTEM_PROMPT = """You are an expert AI for analyzing health lab reports. The input is OCR-extracted text which may contain spelling errors or incomplete data.

Analyze the provided text and respond ONLY with valid JSON — no extra text outside the JSON.
Write all Thai text in a friendly, plain language that any non-medical person can understand.

{
  "summary": "Overall health summary in Thai, plain language, max 4 sentences",
  "parameters": [
    {
      "name": "parameter name in English",
      "name_th": "parameter name in Thai",
      "value": "measured value as string",
      "unit": "unit of measurement",
      "normal_range": "normal reference range e.g. 70-100 or <200",
      "status": "normal or high or low",
      "what_is_it": "1 sentence in Thai: what this test measures and why it matters to the body, for a general audience",
      "verdict": "plain Thai verdict: e.g. 'ปกติ — ค่าอยู่ในเกณฑ์ดี' or 'สูงกว่าปกติ — ควรระวัง' or 'ต่ำกว่าปกติ — ควรติดตาม'",
      "tip": "1 short practical Thai tip for this specific value, e.g. food, lifestyle advice"
    }
  ],
  "abnormal_count": 0,
  "overall_status": "normal or mild or moderate or severe"
}"""

CHAT_SYSTEM_PROMPT = """You are MediLens Assistant, an intelligent health lab report helper.
Answer questions in warm, friendly, easy-to-understand Thai. Keep responses concise (max 4-5 sentences).

Use the following lab report data to answer:
{context}

If the user asks something outside the available data, politely suggest consulting a doctor."""


def _extract_json(text: str) -> dict | None:
    """Try to parse JSON from LLM output (handles markdown wrapping)."""
    # Strip markdown code fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip()
    # Find first { ... }
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return None


class TyphoonService:
    """NLP service powered by Typhoon AI (OpenAI-compatible API)."""

    def __init__(self):
        self.api_key = os.getenv("TYPHOON_API_KEY")
        self.model = os.getenv("TYPHOON_MODEL", "typhoon-v2-8b")
        self._client = None

    @property
    def client(self):
        if self._client is None and self.api_key:
            self._client = OpenAI(
                api_key=self.api_key,
                base_url="https://api.opentyphoon.ai/v1",
            )
        return self._client

    def is_available(self) -> bool:
        return self.client is not None and bool(self.api_key)

    # ------------------------------------------------------------------
    # Analyze lab results
    # ------------------------------------------------------------------
    def analyze(self, ocr_text: str) -> dict:
        if not self.is_available():
            return self._fallback_analysis(ocr_text)

        try:
            resp = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": ANALYZE_SYSTEM_PROMPT},
                    {"role": "user", "content": f"ข้อมูลจาก OCR:\n{ocr_text}"},
                ],
                temperature=0.2,
                max_tokens=2000,
            )
            raw = resp.choices[0].message.content or ""
            result = _extract_json(raw)
            if result:
                return result
        except Exception as e:
            logging.error("Typhoon analyze failed: %s", e)

        return self._fallback_analysis(ocr_text)

    # ------------------------------------------------------------------
    # Chat
    # ------------------------------------------------------------------
    def chat(self, question: str, context: str) -> str:
        if not self.is_available():
            return self._fallback_chat(question)

        try:
            resp = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": CHAT_SYSTEM_PROMPT.format(context=context),
                    },
                    {"role": "user", "content": question},
                ],
                temperature=0.5,
                max_tokens=800,
            )
            return resp.choices[0].message.content or ""
        except Exception as e:
            logging.error("Typhoon chat failed: %s", e)
            return self._fallback_chat(question)

    # ------------------------------------------------------------------
    # Fallbacks (used when API key missing or request fails)
    # ------------------------------------------------------------------
    @staticmethod
    def _fallback_analysis(ocr_text: str) -> dict:
        return {
            "summary": "ไม่สามารถเชื่อมต่อ Typhoon API ได้ กรุณาตั้งค่า TYPHOON_API_KEY ในไฟล์ .env",
            "parameters": [],
            "abnormal_count": 0,
            "overall_status": "unknown",
        }

    @staticmethod
    def _fallback_chat(question: str) -> str:
        return (
            "ขออภัยครับ ขณะนี้ระบบ AI ไม่พร้อมให้บริการ "
            "กรุณาตั้งค่า TYPHOON_API_KEY ในไฟล์ .env "
            "หรือลองอีกครั้งในภายหลัง 🙏"
        )
