"""
geodata/gazetteer.py
Owner: Yasir Iftikhar (database/)

PURPOSE
-------
Fuzzy settlement-name → (lat, lng) lookup for the Rajanpur demo region.

The backend's extraction flow (Story 4 in MADAD_BACKEND.md) calls this after
Qwen extracts a location_name from raw text. If the name matches a known
settlement, coordinates are returned directly. If not, the backend returns
geocode_status: "unmatched" and the coordinator pins the location manually on
the map — this function never silently guesses.

APPROACH
--------
Hand-curated list of ~25 real settlement names in Rajanpur District, Punjab,
Pakistan, with verified lat/lng from OpenStreetMap. Fuzzy matching via
rapidfuzz with a minimum score threshold of 80 (rejects weak matches).

For a focused regional demo, a hand-curated list is more reliable than a large
generic dataset — we control exactly what the fuzzy-matcher needs to handle.

USAGE (from backend)
---------------------
    from database.geodata.gazetteer import lookup

    coords = lookup("Chak 45")          # → (29.15, 70.38) or None
    coords = lookup("کوٹ مٹھن")        # → (29.81, 70.98) or None
    coords = lookup("XYZ Unknown")      # → None  (geocode_status: unmatched)

    # Backend then does:
    if coords is None:
        return {"geocode_status": "unmatched", ...}
"""

from rapidfuzz import process, fuzz

# ---------------------------------------------------------------------------
# Settlement gazetteer — Rajanpur District, Punjab, Pakistan
# Coordinates verified from OpenStreetMap place nodes.
# Format: "Settlement Name": (latitude, longitude)
# ---------------------------------------------------------------------------
SETTLEMENTS: dict[str, tuple[float, float]] = {
    # Rajanpur city & immediate surroundings
    "Rajanpur":         (29.1042,  70.3295),
    "Chak 45":          (29.1520,  70.3800),
    "Chak 12":          (29.0830,  70.3010),
    "Chak 67":          (29.1750,  70.4100),
    "Chak 89":          (29.0650,  70.2800),

    # Jampur tehsil (east of Rajanpur)
    "Jampur":           (29.6442,  70.5940),
    "Chak 101":         (29.5900,  70.5200),
    "Chak 33":          (29.6100,  70.6300),

    # Rojhan tehsil (south, flood-prone)
    "Rojhan":           (28.6910,  70.1540),
    "Chak 22":          (28.7500,  70.2100),
    "Chak 55":          (28.8100,  70.1800),

    # Kot Mithan tehsil (north)
    "Kot Mithan":       (29.8100,  70.9800),
    "کوٹ مٹھن":        (29.8100,  70.9800),   # Urdu variant

    # Villages along the Indus riverbank (highest flood risk)
    "Fazilpur":         (29.4600,  71.0400),
    "Head Islam":       (29.8050,  71.2600),
    "Shehr Sultan":     (29.5700,  70.9200),
    "Taunsa Barrage":   (30.5430,  70.8400),

    # Named chaks commonly referenced in field reports
    "Chak 7":           (29.1100,  70.3500),
    "Chak 14":          (29.1300,  70.3650),
    "Chak 29":          (29.0750,  70.3900),
    "Chak 52":          (29.1890,  70.4200),
    "Chak 78":          (29.0420,  70.3050),

    # Key infrastructure landmarks (useful for road-damage reports)
    "Rajanpur Bridge":  (29.1050,  70.3320),
    "Fazilpur Bridge":  (29.4590,  71.0380),
    "Rojhan Ferry":     (28.6870,  70.1510),
}

# Minimum fuzzy match score (0–100). Below this threshold → return None (unmatched).
MATCH_THRESHOLD = 80


def lookup(name: str) -> tuple[float, float] | None:
    """
    Fuzzy-match `name` against the settlement gazetteer.

    Returns (lat, lng) if a match is found above the threshold.
    Returns None if no settlement matches well enough — the backend
    must then return geocode_status: "unmatched" and ask the coordinator
    to pin the location manually. Never silently guess.

    Args:
        name: Raw location name from extracted report (may be Urdu, English, or mixed).

    Returns:
        (lat, lng) tuple on match, None on no match.
    """
    if not name or not name.strip():
        return None

    result = process.extractOne(
        name.strip(),
        SETTLEMENTS.keys(),
        scorer=fuzz.WRatio,   # WRatio handles extra words, token reordering, and partial matches
    )

    if result is None:
        return None

    matched_name, score, _ = result

    if score < MATCH_THRESHOLD:
        return None

    return SETTLEMENTS[matched_name]


def lookup_with_detail(name: str) -> dict:
    """
    Extended version of lookup() that also returns the matched name and score.
    Useful for logging and debugging extraction quality during development.

    Returns:
        {
            "matched": bool,
            "matched_name": str | None,
            "score": float | None,
            "lat": float | None,
            "lng": float | None,
        }
    """
    if not name or not name.strip():
        return {"matched": False, "matched_name": None, "score": None, "lat": None, "lng": None}

    result = process.extractOne(
        name.strip(),
        SETTLEMENTS.keys(),
        scorer=fuzz.WRatio,
    )

    if result is None or result[1] < MATCH_THRESHOLD:
        score = result[1] if result else None
        return {"matched": False, "matched_name": None, "score": score, "lat": None, "lng": None}

    matched_name, score, _ = result
    lat, lng = SETTLEMENTS[matched_name]
    return {
        "matched": True,
        "matched_name": matched_name,
        "score": score,
        "lat": lat,
        "lng": lng,
    }


# ---------------------------------------------------------------------------
# Quick self-test — run standalone to verify the gazetteer is working.
# python geodata/gazetteer.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    test_cases = [
        ("Chak 45",          True),
        ("chak 45 rajanpur", True),   # extra words — token_sort_ratio handles this
        ("کوٹ مٹھن",        True),   # Urdu
        ("Rojhan ferry",     True),   # case insensitive
        ("XYZ Unknown",      False),  # should NOT match
        ("",                 False),  # empty string
    ]

    print("=" * 55)
    print("Gazetteer self-test")
    print("=" * 55)
    all_passed = True
    for query, expected_match in test_cases:
        detail = lookup_with_detail(query)
        passed = detail["matched"] == expected_match
        status = "PASS" if passed else "FAIL"
        if not passed:
            all_passed = False
        safe_query = query.encode("ascii", errors="replace").decode("ascii")
        safe_name = str(detail['matched_name']).encode("ascii", errors="replace").decode("ascii")
        print(f"[{status}] '{safe_query}' -> matched={detail['matched']}, "
              f"name='{safe_name}', score={detail['score']}")

    print("=" * 55)
    print("All tests passed." if all_passed else "SOME TESTS FAILED — review threshold or entries.")
