from abc import ABC, abstractmethod
from app.schemas.report import ExtractedReportData


class ExtractionProvider(ABC):
    @abstractmethod
    async def extract(self, raw_text: str) -> ExtractedReportData:
        """Extract structured relief needs from raw field situation report."""
        pass
