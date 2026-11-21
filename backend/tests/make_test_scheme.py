# Helper: create a TEST_ scheme via admin API for UI testing; prints its id
import requests, sys
sys.path.insert(0, "/app/backend/tests")
from conftest import TokenProvider, ADMIN_UID, BASE_URL
from test_scheme_saathi_api import scheme_payload

tp = TokenProvider(ADMIN_UID)
r = requests.post(f"{BASE_URL}/api/admin/schemes", headers=tp.h(), json=scheme_payload("TEST_UI Admin Scheme"))
r.raise_for_status()
print(r.json()["id"])
