import logging
import httpx
from app.services.extraction.base import ExtractionProvider
from app.schemas.report import ExtractedReportData
from app.core.config import settings

logger = logging.getLogger(__name__)


class GemmaProvider(ExtractionProvider):
    """Stretch Goal: Local Gemma 2B/4B extraction via Ollama."""

    def __init__(self, ollama_url: str = settings.OLLAMA_URL, model: str = settings.OLLAMA_MODEL):
        self.ollama_url = ollama_url
        self.model = model

    async def extract(self, raw_text: str) -> ExtractedReportData:
        # Stub implementation ready for local Ollama invocation
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{self.ollama_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": "Extract structured relief entities (location_name, estimated_population, needs, urgency_flags) in JSON."},
                            {"role": "user", "content": raw_text}
                        ],
                        "format": "json",
                        "stream": False
                    }
                )
                if response.status_code == 200:
                    import json
                    content = response.json().get("message", {}).get("content", "{}")
                    parsed = json.loads(content)
                    return ExtractedReportData(
                        location_name=parsed.get("location_name", "Extracted Village"),
                        estimated_population=int(parsed.get("estimated_population", 100)),
                        needs=parsed.get("needs", ["food", "water"]),
                        urgency_flags=parsed.get("urgency_flags", []),
                        confidence="single_unverified"
                    )
        except Exception as e:
            logger.warning(f"Ollama local extraction not running: {e}")
        
        raise NotImplementedError("Local Gemma extraction via Ollama is a stretch goal. Please set EXTRACTION_PROVIDER=qwen in .env")
