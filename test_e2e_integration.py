#!/usr/bin/env python3
"""
End-to-end integration test for MADAD (PostgreSQL + FastAPI).
Run with backend up: python -m uvicorn app.main:app --port 8000 (from backend/)

    python test_e2e_integration.py
"""

import sys
import httpx

BASE = "http://127.0.0.1:8000/api"
CENTER_CODE = "RJP-01"
USERNAME = "bilal"
PASSWORD = "bilal123"


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"  OK: {msg}")


def main() -> None:
    print("MADAD E2E Integration Test")
    print("=" * 50)

    with httpx.Client(base_url=BASE, timeout=30.0) as client:
        # 1. Health
        r = client.get("http://127.0.0.1:8000/health")
        if r.status_code != 200:
            fail(f"Health check: {r.status_code}")
        ok("Health check")

        # 2. Login
        r = client.post("/auth/login", json={
            "center_code": CENTER_CODE,
            "username": USERNAME,
            "password": PASSWORD,
        })
        if r.status_code != 200:
            fail(f"Login: {r.status_code} {r.text}")
        data = r.json()
        token = data["access_token"]
        center_id = data["center_id"]
        headers = {"Authorization": f"Bearer {token}"}
        ok(f"Login as {USERNAME} (center_id={center_id})")

        # 3. Depots
        r = client.get("/depots", params={"center_id": center_id}, headers=headers)
        if r.status_code != 200 or not r.json():
            fail(f"Depots: {r.status_code} {r.text}")
        depot_id = r.json()[0]["id"]
        ok(f"Depots loaded (depot_id={depot_id})")

        # 4. Submit raw report
        sample_text = (
            "Chak 45 mein 150 families phans gayi hain. Pani barh raha hai. "
            "Bachay aur buzurg hain. Khana aur pani darkaar hai."
        )
        r = client.post("/reports", json={
            "center_id": center_id,
            "source": "sms_stub",
            "raw_text": sample_text,
        }, headers=headers)
        if r.status_code != 201:
            fail(f"Create report: {r.status_code} {r.text}")
        report_id = r.json()["report_id"]
        ok(f"Report created (id={report_id})")

        # 5. Extract
        r = client.post(f"/reports/{report_id}/extract", headers=headers)
        if r.status_code != 200:
            fail(f"Extract: {r.status_code} {r.text}")
        extract = r.json()
        if extract.get("geocode_status") == "matched":
            lat, lng = extract["lat"], extract["lng"]
        else:
            lat, lng = 29.1520, 70.3800
        ok(f"Extracted location={extract['extracted']['location_name']} geocode={extract['geocode_status']}")

        # 6. Confirm → site
        r = client.patch(f"/reports/{report_id}", json={
            "location_name": extract["extracted"]["location_name"],
            "lat": lat,
            "lng": lng,
            "estimated_population": extract["extracted"]["estimated_population"],
            "needs": extract["extracted"]["needs"],
            "urgency_flags": extract["extracted"]["urgency_flags"],
            "status": "confirmed",
        }, headers=headers)
        if r.status_code != 200 or not r.json().get("site_id"):
            fail(f"Confirm report: {r.status_code} {r.text}")
        site_id = r.json()["site_id"]
        ok(f"Site confirmed (id={site_id})")

        # 7. Sites list
        r = client.get("/sites", params={"center_id": center_id, "status": "unserved"}, headers=headers)
        if r.status_code != 200:
            fail(f"Sites: {r.status_code}")
        ok(f"Sites listed ({len(r.json())} unserved)")

        # 8. Generate plan
        r = client.post("/plan/generate", json={"center_id": center_id}, headers=headers)
        if r.status_code != 200:
            fail(f"Plan generate: {r.status_code} {r.text}")
        allocations = r.json().get("allocations", [])
        ok(f"Plan generated ({len(allocations)} allocations)")

        # 9. Road damage + replan
        r = client.post("/roads/damage", json={
            "center_id": center_id,
            "lat": 29.12,
            "lng": 70.35,
            "reason": "Bridge submerged (E2E test)",
        }, headers=headers)
        if r.status_code != 201:
            fail(f"Road damage: {r.status_code} {r.text}")
        ok("Road damage reported")

        r = client.post("/plan/replan", json={
            "center_id": center_id,
            "trigger": "road_damage",
        }, headers=headers)
        if r.status_code != 200:
            fail(f"Replan: {r.status_code} {r.text}")
        ok("Replan completed")

        # 10. Dispatch (use plan allocation if available, else minimal)
        if allocations:
            alloc = allocations[0]
            dispatch_body = {
                "site_id": alloc["site_id"],
                "depot_id": alloc["depot_id"],
                "resources": alloc["resources"],
            }
        else:
            dispatch_body = {
                "site_id": site_id,
                "depot_id": depot_id,
                "resources": [{"resource_type": "food_packet", "quantity": 10}],
            }

        r = client.post("/dispatch", json=dispatch_body, headers=headers)
        if r.status_code != 201:
            fail(f"Dispatch: {r.status_code} {r.text}")
        dispatch_id = r.json()["dispatch_id"]
        ok(f"Dispatch created (id={dispatch_id})")

        # 11. Status transitions
        for new_status in ("en_route", "delivered"):
            r = client.patch(f"/dispatch/{dispatch_id}/status", json={
                "status": new_status,
            }, headers=headers)
            if r.status_code != 200:
                fail(f"Dispatch status {new_status}: {r.status_code} {r.text}")
        ok("Dispatch status: planned → en_route → delivered")

    print("=" * 50)
    print("ALL E2E CHECKS PASSED")


if __name__ == "__main__":
    main()
