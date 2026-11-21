# Iteration 2 retests: AI deadline fallback, archived save/merge, admin 422 field paths, broaden match
import time
import pytest
import requests
from conftest import BASE_URL
from test_scheme_saathi_api import scheme_payload

API = f"{BASE_URL}/api"
FLOW = {"gender": "male", "category": "general", "girl_child": "no", "education": "not_studying"}


# ---------- Broaden: topics ['all'] returns results where 'study' gives none ----------
class TestBroaden:
    def test_study_empty_all_nonempty(self):
        a = requests.post(f"{API}/match", json={"topics": ["study"], "mode": "central", "answers": FLOW}).json()
        b = requests.post(f"{API}/match", json={"topics": ["all"], "mode": "central", "answers": FLOW}).json()
        print("study:", len(a["results"]), "all:", len(b["results"]))
        assert len(b["results"]) > 0


# ---------- AI endpoints must answer within ~50s ----------
class TestAIDeadline:
    @pytest.mark.parametrize("lang", ["hi", "bn"])
    def test_recommend_time(self, lang):
        t = time.time()
        r = requests.post(f"{API}/recommend", json={"topics": ["farming"], "state": "WB", "mode": "both",
                                                     "answers": {"occupation": ["farmer"], "land": "owner"}, "lang": lang}, timeout=90)
        el = time.time() - t
        print(lang, r.status_code, round(el, 1), r.json().get("source"), r.json().get("ai_reason"))
        assert r.status_code == 200 and el < 52
        d = r.json()
        assert d["source"] in ("ai", "rules")
        if d["source"] == "rules":
            assert d["ai_reason"] == "failed"

    @pytest.mark.parametrize("sid", ["ab-pmjay", "pmay-g", "post-matric-sc"])
    def test_explain_time(self, sid):
        t = time.time()
        r = requests.get(f"{API}/schemes/{sid}/explain", params={"lang": "bn"}, timeout=90)
        el = time.time() - t
        print(sid, r.status_code, round(el, 1), r.json().get("available"), r.json().get("reason"))
        assert r.status_code in (200, 404) and el < 52


# ---------- Archived schemes cannot be saved; admin 422 paths ----------
class TestArchivedAndAdmin:
    ids = []

    @classmethod
    def teardown_class(cls):
        import os
        from pymongo import MongoClient
        db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
        for sid in cls.ids:
            db.schemes.delete_one({"id": sid})
            db.saved.delete_many({"scheme_id": sid})

    def test_archived_save_and_merge(self, admin, member):
        r = requests.post(f"{API}/admin/schemes", headers=admin.h(), json=scheme_payload("TEST_Archived It2"))
        assert r.status_code in (200, 201), r.text
        sid = r.json()["id"]
        self.ids.append(sid)
        # saving active works
        assert requests.post(f"{API}/me/saved/{sid}", headers=member.h()).status_code == 200
        requests.delete(f"{API}/me/saved/{sid}", headers=member.h())
        a = requests.post(f"{API}/admin/schemes/{sid}/archive", headers=admin.h(), json={"archived": True})
        assert a.status_code == 200, a.text
        s = requests.post(f"{API}/me/saved/{sid}", headers=member.h())
        assert s.status_code == 404
        m = requests.post(f"{API}/me/saved/merge", headers=member.h(), json={"ids": [sid]})
        assert m.status_code == 200 and sid not in m.json()["ids"]

    def test_admin_422_field_path(self, admin):
        p = scheme_payload("TEST_Bad It2")
        p["official_url"] = "not-a-url"
        p["topics"] = []
        r = requests.post(f"{API}/admin/schemes", headers=admin.h(), json=p)
        print(r.status_code, r.text[:500])
        if r.status_code in (200, 201):
            self.ids.append(r.json()["id"])
        assert r.status_code == 422
