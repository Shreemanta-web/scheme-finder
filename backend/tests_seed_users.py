import urllib.parse
import os, json, urllib.request, urllib.error
from dotenv import load_dotenv; load_dotenv("/app/backend/.env")
from pymongo import MongoClient
SK = os.environ["CLERK_SECRET_KEY"]
def bapi(path, body=None, method="POST"):
    req = urllib.request.Request("https://api.clerk.com/v1" + path, data=json.dumps(body).encode() if body is not None else None, method=method,
        headers={"Authorization": "Bearer " + SK, "Content-Type": "application/json", "User-Agent": "emergent-test"})
    return json.load(urllib.request.urlopen(req))
db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
for email, role in [("admin+clerk_test@example.com", "admin"), ("member+clerk_test@example.com", "member")]:
    try:
        u = bapi("/users", {"email_address": [email], "password": "Test-pass-12345!", "skip_password_checks": True})
    except urllib.error.HTTPError:
        u = json.load(urllib.request.urlopen(urllib.request.Request("https://api.clerk.com/v1/users?email_address=" + urllib.parse.quote(email), headers={"Authorization": "Bearer " + SK, "User-Agent": "emergent-test"})))[0]
    db.users.update_one({"user_id": u["id"]}, {"$set": {"role": role, "env": "preview", "email": email}}, upsert=True)
    print(email, role, u["id"])
