# Helper: show/clear member saved list and delete UI-created TEST_ scheme by id
import os, sys, requests
sys.path.insert(0, "/app/backend/tests")
from conftest import TokenProvider, MEMBER_UID, BASE_URL
from pymongo import MongoClient

tp = TokenProvider(MEMBER_UID)
print("member saved:", requests.get(f"{BASE_URL}/api/me/saved", headers=tp.h()).json())
if "--clean" in sys.argv:
    for sid in requests.get(f"{BASE_URL}/api/me/saved", headers=tp.h()).json()["ids"]:
        requests.delete(f"{BASE_URL}/api/me/saved/{sid}", headers=tp.h())
    db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    for sid in sys.argv[2:]:
        print("deleted", sid, db.schemes.delete_one({"id": sid}).deleted_count)
    print("member saved after:", requests.get(f"{BASE_URL}/api/me/saved", headers=tp.h()).json())
