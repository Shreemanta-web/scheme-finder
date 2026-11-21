# Shared fixtures: base URL, Clerk session tokens for admin/member test users
import os
import time
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
SK = os.environ.get("CLERK_SECRET_KEY")
ADMIN_UID = "user_3MP7ehW4YPFltXjDqsuNQ9jrugo"
MEMBER_UID = "user_3MP7eiIIQ5XILY95eLOlukTh3zi"
CH = {"Authorization": f"Bearer {SK}", "User-Agent": "emergent-test", "Content-Type": "application/json"}


class TokenProvider:
    """Creates a Clerk session for a user and mints fresh short-lived JWTs on demand."""

    def __init__(self, uid):
        r = requests.post("https://api.clerk.com/v1/sessions", headers=CH, json={"user_id": uid}, timeout=20)
        if r.status_code != 200:
            pytest.skip(f"Clerk session creation failed: {r.status_code}")
        self.sid = r.json()["id"]
        self._tok, self._at = None, 0

    def token(self):
        if not self._tok or time.time() - self._at > 40:
            r = requests.post(f"https://api.clerk.com/v1/sessions/{self.sid}/tokens", headers=CH, json={}, timeout=20)
            r.raise_for_status()
            self._tok, self._at = r.json()["jwt"], time.time()
        return self._tok

    def h(self):
        return {"Authorization": f"Bearer {self.token()}"}


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def admin():
    return TokenProvider(ADMIN_UID)


@pytest.fixture(scope="session")
def member():
    return TokenProvider(MEMBER_UID)
