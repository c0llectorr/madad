import json
import logging
import httpx
from app.services.extraction.base import ExtractionProvider
from app.schemas.report import ExtractedReportData
from app.core.config import settings

logger = logging.getLogger(__name__)

EXTRACT_TOOL = {
    "type": "function",
    "function": {
        "name": "extract_relief_need",
        "description": "Extract structured relief needs from a raw field situation report. Translate Roman Urdu terms (e.g. 'pani barh raha hai' -> water_rising, 'bache/khawateen' -> children_present/elderly_present) to standardized English enums.",
        "parameters": {
            "type": "object",
            "properties": {
                "location_name": {
                    "type": "string",
                    "description": "Name of village, chak, basti, or settlement mentioned."
                },
                "estimated_population": {
                    "type": "integer",
                    "description": "Estimated total affected headcount or family count multiplied by average family size (~5-7)."
                },
                "needs": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": [
                            "food",
                            "water",
                            "medical_evacuation",
                            "shelter",
                            "medicine",
                            "general_evacuation"
                        ]
                    },
                    "description": "Explicit relief supplies or interventions requested."
                },
                "urgency_flags": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": [
                            "elderly_present",
                            "children_present",
                            "pregnancy",
                            "injury_reported",
                            "water_rising",
                            "stranded_no_exit"
                        ]
                    },
                    "description": "Life-safety threat indicators present in the situation report."
                },
                "confidence": {
                    "type": "string",
                    "enum": ["single_unverified", "corroborated"],
                    "description": "Confidence level (default single_unverified for new field report)."
                }
            },
            "required": ["location_name", "needs"]
        }
    }
}


class QwenProvider(ExtractionProvider):
    def __init__(self, api_key: str = settings.QWEN_API_KEY, api_url: str = settings.QWEN_API_URL):
        self.api_key = api_key
        self.api_url = api_url
        self.model = settings.QWEN_MODEL

    async def extract(self, raw_text: str) -> ExtractedReportData:
        # If API key is not configured or in testing/offline mode, fallback to heuristic extraction
        if not self.api_key or self.api_key == "your_alibaba_cloud_key":
            return self._heuristic_fallback_extraction(raw_text)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a crisis relief data extraction system for the National Disaster Management Authority (NDMA). You extract structured entities from raw situation reports. You NEVER decide allocations or make policy judgments; you only extract factual entities."
                },
                {
                    "role": "user",
                    "content": f"Extract structured relief data from this field report:\n\n{raw_text}"
                }
            ],
            "tools": [EXTRACT_TOOL],
            "tool_choice": {"type": "function", "function": {"name": "extract_relief_need"}}
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.api_url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                
                choice = data["choices"][0]["message"]
                tool_calls = choice.get("tool_calls", [])
                if tool_calls:
                    arguments_str = tool_calls[0]["function"]["arguments"]
                    args = json.loads(arguments_str)
                    return ExtractedReportData(
                        location_name=args.get("location_name", "Unknown Location"),
                        estimated_population=int(args.get("estimated_population", 50)),
                        needs=args.get("needs", ["food", "water"]),
                        urgency_flags=args.get("urgency_flags", []),
                        confidence=args.get("confidence", "single_unverified")
                    )
                else:
                    return self._heuristic_fallback_extraction(raw_text)
        except Exception as e:
            logger.warning(f"Qwen API extraction failed or timed out: {e}. Using deterministic parser.")
            return self._heuristic_fallback_extraction(raw_text)

    def _heuristic_fallback_extraction(self, text: str) -> ExtractedReportData:
        """Deterministic rule-based extraction fallback for offline / mock testing."""
        text_lower = text.lower()
        
        # Location extraction heuristic
        location = "Chak 45"
        for loc in ["chak 45", "basti qadirpur", "sultan kot", "kot mithan", "fazilpur", "rajanpur", "jampur", "basti dasti", "chak 38"]:
            if loc in text_lower:
                location = loc.title()
                break

        # Population extraction heuristic
        pop = 100
        import re
        numbers = re.findall(r'(\d+)\s*(?:families|people|persons|houses|headcount)?', text_lower)
        if numbers:
            try:
                found_num = int(numbers[0])
                # If stated in families (e.g. 150-200 families), multiply by avg household ~5-6
                if "famil" in text_lower or found_num <= 300:
                    pop = found_num if "famil" not in text_lower else found_num * 5
                else:
                    pop = found_num
            except Exception:
                pop = 150

        # Needs extraction
        needs = []
        if any(k in text_lower for k in ["food", "ration", "khana", "roti"]):
            needs.append("food")
        if any(k in text_lower for k in ["water", "drinking", "pani", "paani"]):
            needs.append("water")
        if any(k in text_lower for k in ["medical", "doctor", "pregnant", "hospital", "evacuat", "dawa", "ambulance"]):
            needs.append("medical_evacuation")
        if any(k in text_lower for k in ["tent", "shelter", "tents", "chhat", "khayma"]):
            needs.append("shelter")
        if any(k in text_lower for k in ["medicine", "tablets", "first aid"]):
            needs.append("medicine")
        if not needs:
            needs = ["food", "water"]

        # Urgency flags extraction
        urgency_flags = []
        if any(k in text_lower for k in ["pregnant", "pregnancy", "hamla"]):
            urgency_flags.append("pregnancy")
        if any(k in text_lower for k in ["injury", "injured", "wound", "zakhmi"]):
            urgency_flags.append("injury_reported")
        if any(k in text_lower for k in ["water rising", "water entered", "pani charh", "pani barh", "flooding"]):
            urgency_flags.append("water_rising")
        if any(k in text_lower for k in ["rooftop", "stranded", "stuck", "no exit", "phansay", "ghire"]):
            urgency_flags.append("stranded_no_exit")
        if any(k in text_lower for k in ["old", "elderly", "buzurg", "senior"]):
            urgency_flags.append("elderly_present")
        if any(k in text_lower for k in ["kid", "child", "children", "bache", "bachay", "infant"]):
            urgency_flags.append("children_present")

        return ExtractedReportData(
            location_name=location,
            estimated_population=pop,
            needs=needs,
            urgency_flags=urgency_flags,
            confidence="single_unverified"
        )
