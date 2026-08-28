from typing import Optional, Tuple
from sqlalchemy.orm import Session
from database.geodata.gazetteer import lookup_settlement


class GeocodingService:
    @staticmethod
    def match_location(db: Session, location_name: str, threshold: float = 70.0) -> Optional[Tuple[float, float, str]]:
        """
        Fuzzy match extracted location_name against the settlement gazetteer script (Section 5).
        Returns (lat, lng, canonical_name) if matched with score >= threshold, else None.
        """
        return lookup_settlement(location_name, threshold=threshold)
