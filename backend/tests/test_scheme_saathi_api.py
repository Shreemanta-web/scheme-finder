# Scheme Saathi backend regression tests: public catalogue, matching, AI, auth/roles, saved, admin CRUD
import os
import pytest
import requests
from datetime import date
from pymongo import MongoClient
from conftest import BASE_URL, ADMIN_UID, MEMBER_UID

API = f"{BASE_URL}/api"
WB_IDS = {"krishak-bandhu", "kanyashree", "swasthya-sathi"}


def scheme_payload(name="TEST_Scheme Alpha"):
    return {
        "name": {"en": name, "hi": "परीक्षण"}, "official_name": name, "jurisdiction": "central", "states": ["WB"],
        "topics": ["health"], "benefit_type": "insurance", "summary": {"en": "Test summary"},
        "benefits": {"en": "Test benefits"}, "eligibility": {"en": ["Anyone"]}, "documents": {"en": ["Aadhaar"]},
        "steps": {"en": ["Visit office"]}, "official_url": "https://example.gov.in",
    }


# ---------- Public catalogue ----------
class TestPublic:
    def test_health_meta(self):
        assert requests.get(f"{API}/health").json() == {"ok": True}
        m = requests.get(f"{API}/meta").json()
        assert m["ai_available"] == True and len(m["state_codes"]) == 36
        assert "GEMINI" not in str(m) and "AIza" not in str(m)

    def test_list_and_detail(self):
        lst = requests.get(f"{API}/schemes").json()
        assert len(lst) >= 21 and all("_id" not in s for s in lst)
        d = requests.get(f"{API}/schemes/pm-kisan").json()
        assert d["id"] == "pm-kisan" and d["source_status"] == "unverified" and "translation_status" in d

    def test_bad_scheme_404(self):
        assert requests.get(f"{API}/schemes/does-not-exist").status_code == 404
        assert requests.get(f"{API}/schemes/does-not-exist/explain?lang=hi").status_code == 404

    def test_batch(self):
        r = requests.post(f"{API}/schemes/batch", json={"ids": ["ssy", "pm-kisan", "nope"]})
        assert [s["id"] for s in r.json()] == ["ssy", "pm-kisan"]


# ---------- Matching ----------
class TestMatch:
    def test_wb_both_includes_state(self):
        r = requests.post(f"{API}/match", json={"topics": ["all"], "state": "WB", "mode": "both", "answers": {}})
        assert r.status_code == 200
        ids = {x["scheme_id"] for x in r.json()["results"]}
        assert WB_IDS <= ids and "mjpjay" not in ids and "ladli-behna" not in ids

    def test_central_only_excludes_state(self):
        r = requests.post(f"{API}/match", json={"topics": ["all"], "state": "WB", "mode": "central", "answers": {}})
        ids = {x["scheme_id"] for x in r.json()["results"]}
        assert not (ids & WB_IDS) and "pm-kisan" in ids

    def test_excluded_and_empty(self):
        r = requests.post(f"{API}/match", json={"topics": ["study"], "state": "WB", "mode": "both",
                                                 "answers": {"gender": "male", "category": "general", "girl_child": "no"}})
        d = r.json()
        assert d["results"] == [] and {e["id"] for e in d["excluded"]} >= {"kanyashree", "post-matric-sc", "ssy"}

    def test_strong_match_farmer(self):
        r = requests.post(f"{API}/match", json={"topics": ["farming"], "state": "WB", "mode": "both",
                                                 "answers": {"occupation": ["farmer"], "land": "owner", "taxpayer": "no"}})
        res = {x["scheme_id"]: x for x in r.json()["results"]}
        assert res["pm-kisan"]["level"] == "strong" and "krishak-bandhu" in res

    @pytest.mark.parametrize("body", [
        {"answers": {"foo": "bar"}}, {"answers": {"age": "999"}}, {"answers": {"occupation": "farmer"}},
        {"topics": ["xyz"]}, {"state": "ZZ"}, {"mode": "state"},
    ])
    def test_validation_422(self, body):
        assert requests.post(f"{API}/match", json=body).status_code == 422


# ---------- AI (Gemini) ----------
class TestAI:
    def test_explain_hi(self):
        r = requests.get(f"{API}/schemes/pmsby/explain?lang=hi", timeout=120)
        assert r.status_code == 200
        d = r.json()
        print("explain:", d.get("available"), d.get("reason"))
        assert d["available"] == True
        assert any("\u0900" <= ch <= "\u097F" for ch in d["explanation"]["summary"])

    def test_recommend_bn(self):
        body = {"topics": ["farming"], "state": "WB", "mode": "both", "lang": "bn",
                "answers": {"occupation": ["farmer"], "land": "owner"}}
        r = requests.post(f"{API}/recommend", json=body, timeout=180)
        d = r.json()
        print("recommend source:", d.get("source"), d.get("ai_reason"))
        cand = {c["scheme_id"] for c in d["candidates"]}
        assert d["best_scheme_id"] in cand
        assert d["source"] == "ai"
        assert any("\u0980" <= ch <= "\u09FF" for ch in d["headline"])

    def test_recommend_with_ids(self):
        r = requests.post(f"{API}/recommend", json={"topics": ["all"], "state": "WB", "mode": "both",
                                                     "scheme_ids": ["pmjjby", "pmsby"], "lang": "en"}, timeout=180)
        d = r.json()
        assert {c["scheme_id"] for c in d["candidates"]} <= {"pmjjby", "pmsby"} and d["best_scheme_id"] in {"pmjjby", "pmsby"}


# ---------- Auth / roles ----------
class TestAuth:
    def test_me_401(self):
        assert requests.get(f"{API}/me").status_code == 401
        assert requests.get(f"{API}/me", headers={"Authorization": "Bearer garbage"}).status_code == 401

    def test_me_roles(self, admin, member):
        assert requests.get(f"{API}/me", headers=admin.h()).json()["role"] == "admin"
        assert requests.get(f"{API}/me", headers=member.h()).json()["role"] == "member"

    def test_member_forbidden(self, member):
        for path in ["/admin/schemes", "/admin/system", "/users"]:
            assert requests.get(f"{API}{path}", headers=member.h()).status_code == 403
        assert requests.post(f"{API}/admin/schemes", headers=member.h(), json=scheme_payload()).status_code == 403

    def test_admin_system_users(self, admin):
        assert requests.get(f"{API}/admin/system", headers=admin.h()).json()["gemini_configured"] == True
        u = requests.get(f"{API}/users", headers=admin.h()).json()
        assert "admin" in u["roles"] and any(x["user_id"] == ADMIN_UID for x in u["users"])

    def test_demote_only_admin_409(self, admin):
        r = requests.patch(f"{API}/users/{ADMIN_UID}/role", headers=admin.h(), json={"role": "member"})
        assert r.status_code == 409
        assert requests.patch(f"{API}/users/{MEMBER_UID}/role", headers=admin.h(), json={"role": "bogus"}).status_code == 403


# ---------- Saved schemes ----------
class TestSaved:
    def test_saved_isolation(self, admin, member):
        assert requests.post(f"{API}/me/saved/ssy", headers=member.h()).status_code == 200
        assert requests.post(f"{API}/me/saved/nope", headers=member.h()).status_code == 404
        assert "ssy" in requests.get(f"{API}/me/saved", headers=member.h()).json()["ids"]
        assert "ssy" not in requests.get(f"{API}/me/saved", headers=admin.h()).json()["ids"]
        m = requests.post(f"{API}/me/saved/merge", headers=member.h(), json={"ids": ["pmsby", "bad-id"]}).json()
        assert {"ssy", "pmsby"} <= set(m["ids"]) and "bad-id" not in m["ids"]
        for sid in ("ssy", "pmsby"):
            requests.delete(f"{API}/me/saved/{sid}", headers=member.h())
        ids = requests.get(f"{API}/me/saved", headers=member.h()).json()["ids"]
        assert "ssy" not in ids and "pmsby" not in ids


# ---------- Admin scheme CRUD ----------
class TestAdminCRUD:
    created = []

    @classmethod
    def teardown_class(cls):
        # No delete API exists: remove only the TEST_ schemes this class created, by id
        db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
        for sid in cls.created:
            db.schemes.delete_one({"id": sid})
            db.explanations.delete_many({"scheme_id": sid})

    def _create(self, admin, name="TEST_Scheme Alpha"):
        r = requests.post(f"{API}/admin/schemes", headers=admin.h(), json=scheme_payload(name))
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        self.created.append(sid)
        return sid, r.json()

    def test_create_and_read(self, admin):
        sid, s = self._create(admin)
        assert s["states"] == [] and s["source_status"] == "unverified"
        assert requests.get(f"{API}/schemes/{sid}").json()["name"]["en"] == "TEST_Scheme Alpha"

    def test_update_flow(self, admin):
        sid, _ = self._create(admin, "TEST_Scheme Update")
        payload = scheme_payload("TEST_Scheme Beta")
        u = requests.put(f"{API}/admin/schemes/{sid}", headers=admin.h(), json=payload)
        assert u.status_code == 200
        assert requests.get(f"{API}/schemes/{sid}").json()["name"]["en"] == "TEST_Scheme Beta"

    def test_verify_flow(self, admin):
        sid, _ = self._create(admin, "TEST_Scheme Verify")
        v = requests.post(f"{API}/admin/schemes/{sid}/verify", headers=admin.h()).json()
        assert v["source_status"] == "verified" and v["last_checked"] == date.today().isoformat()

    def test_archive_hides_publicly(self, admin):
        sid, _ = self._create(admin, "TEST_Scheme Archive")
        a = requests.post(f"{API}/admin/schemes/{sid}/archive", headers=admin.h(), json={"archived": True})
        assert a.json()["archived"] == True
        assert requests.get(f"{API}/schemes/{sid}").status_code == 404
        assert sid not in [x["id"] for x in requests.get(f"{API}/schemes").json()]
        assert sid not in [x["scheme_id"] for x in requests.post(f"{API}/match", json={"topics": ["all"]}).json()["results"]]
        assert sid in [x["id"] for x in requests.get(f"{API}/admin/schemes", headers=admin.h()).json()]

    def test_restore_after_archive(self, admin):
        sid, _ = self._create(admin, "TEST_Scheme Restore")
        requests.post(f"{API}/admin/schemes/{sid}/archive", headers=admin.h(), json={"archived": True})
        requests.post(f"{API}/admin/schemes/{sid}/archive", headers=admin.h(), json={"archived": False})
        assert requests.get(f"{API}/schemes/{sid}").status_code == 200

    def test_create_validation(self, admin):
        bad = scheme_payload()
        bad["name"] = {"en": "  ", "hi": "x"}
        assert requests.post(f"{API}/admin/schemes", headers=admin.h(), json=bad).status_code == 422
        bad = scheme_payload()
        bad["official_url"] = "notaurl"
        assert requests.post(f"{API}/admin/schemes", headers=admin.h(), json=bad).status_code == 422
        assert requests.put(f"{API}/admin/schemes/nope", headers=admin.h(), json=scheme_payload()).status_code == 404
        assert requests.post(f"{API}/admin/schemes/nope/verify", headers=admin.h()).status_code == 404
