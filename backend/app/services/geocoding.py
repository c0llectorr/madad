import sys
import os
from typing import Optional, Tuple
from sqlalchemy.orm import Session

# Add the parent directory to Python path to import from database module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

try:
    from database.geodata.gazetteer import lookup, lookup_with_detail
    GAZETTEER_AVAILABLE = True
except ImportError:
    GAZETTEER_AVAILABLE = False
    print("Warning: Gazetteer module not found. Using fallback geocoding.")


class GeocodingService:
    @staticmethod
    def match_location(db: Session, location_name: str, threshold: float = 70.0) -> Optional[Tuple[float, float, str]]:
        """
        Fuzzy match extracted location_name against the settlement gazetteer script (Section 5).
        Returns (lat, lng, canonical_name) if matched with score >= threshold, else None.
        """
        if not GAZETTEER_AVAILABLE:
            # Fallback to simple geocoding if gazetteer not available
            return None
        
        try:
            # Use lookup_with_detail to get both coordinates and matched name
            result = lookup_with_detail(location_name)
            if result.get("matched"):
                lat = result.get("lat")
                lng = result.get("lng")
                matched_name = result.get("matched_name")
                if lat is not None and lng is not None and matched_name is not None:
                    return (lat, lng, matched_name)
            return None
        except Exception as e:
            print(f"Geocoding error: {e}")
            return None
