# Helper: print a Clerk sign-in ticket for a test user (usage: python make_ticket.py admin|member)
import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
UIDS = {"admin": "user_3MP7ehW4YPFltXjDqsuNQ9jrugo", "member": "user_3MP7eiIIQ5XILY95eLOlukTh3zi"}
r = requests.post("https://api.clerk.com/v1/sign_in_tokens", json={"user_id": UIDS[sys.argv[1]], "expires_in_seconds": 600},
                  headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "emergent-test"}, timeout=20)
r.raise_for_status()
print(r.json()["token"])
