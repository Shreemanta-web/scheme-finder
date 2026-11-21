# Regression for iteration 3 code-quality refactor: seed scheme() **opts, matching helpers, recommend() helpers
import pytest
import requests
from conftest import BASE_URL

SEED_IDS = ["pm-kisan", "pmfby", "ab-pmjay", "pmay-g", "pmay-u", "pmmy", "pmegp", "pm-vishwakarma", "pmkvy",
            "post-matric-sc", "apy", "ssy", "pmuy", "ignoaps", "pmjjby", "pmsby", "kanyashree", "krishak-bandhu",
            "swasthya-sathi", "mjpjay", "ladli-behna"]


# Seed data: all 21 seed schemes present with correct urls / opts
class TestSeed:
    def test_all_seed_ids_present(self):
        r = requests.post(f"{BASE_URL}/api/schemes/batch", json={"ids": SEED_IDS}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("schemes", data.get("items", []))
        assert {s["id"] for s in items} == set(SEED_IDS)

    @pytest.mark.parametrize("sid,app_url,off_url,mode", [
        ("ab-pmjay", "https://beneficiary.nha.gov.in/", "https://pmjay.gov.in/", "both"),
        ("pmmy", "https://www.jansamarth.in/", "https://www.mudra.org.in/", "both"),
        ("pm-kisan", "https://pmkisan.gov.in/", "https://pmkisan.gov.in/", "both"),
        ("pmay-u", "https://pmay-urban.gov.in/", "https://pmay-urban.gov.in/", "online"),
        ("swasthya-sathi", "https://swasthyasathi.gov.in/", "https://swasthyasathi.gov.in/", "offline"),
    ])
    def test_urls_and_mode(self, sid, app_url, off_url, mode):
        d = requests.get(f"{BASE_URL}/api/schemes/{sid}", timeout=20).json()
        d = d.get("scheme", d)
        assert d["application_url"] == app_url
        assert d["official_url"] == off_url
        assert d["application_mode"] == mode

    def test_opts_states_exclusions(self):
        k = requests.get(f"{BASE_URL}/api/schemes/kanyashree", timeout=20).json()
        k = k.get("scheme", k)
        assert k["states"] == ["WB"]
        p = requests.get(f"{BASE_URL}/api/schemes/pm-kisan", timeout=20).json()
        p = p.get("scheme", p)
        assert len(p["exclusions"]["en"]) == 6


# Matching: farmer WB results + exclusions
class TestMatchRegression:
    def test_farmer_wb(self):
        body = {"topics": ["farming"], "state": "WB", "mode": "both",
                "answers": {"occupation": ["farmer"], "land": "owner", "taxpayer": "no"}}
        d = requests.post(f"{BASE_URL}/api/match", json=body, timeout=20).json()
        ids = [r["scheme_id"] for r in d["results"]]
        assert {"pm-kisan", "krishak-bandhu", "pmfby"} <= set(ids)
        pk = next(r for r in d["results"] if r["scheme_id"] == "pm-kisan")
        assert pk["level"] == "strong" and pk["pending"] == []

    def test_taxpayer_excluded(self):
        body = {"topics": ["farming"], "state": "WB", "mode": "both",
                "answers": {"occupation": ["farmer"], "land": "owner", "taxpayer": "yes"}}
        d = requests.post(f"{BASE_URL}/api/match", json=body, timeout=20).json()
        exc = {e["id"]: e["failed"] for e in d["excluded"]}
        assert "pm-kisan" in exc and "taxpayer" in exc["pm-kisan"]
        assert "pm-kisan" not in [r["scheme_id"] for r in d["results"]]

    def test_unknown_answers_pending(self):
        body = {"topics": ["farming"], "state": "WB", "mode": "both",
                "answers": {"occupation": ["not_sure"], "land": "skip"}}
        d = requests.post(f"{BASE_URL}/api/match", json=body, timeout=20).json()
        pk = next(r for r in d["results"] if r["scheme_id"] == "pm-kisan")
        assert pk["level"] == "possible" and "occupation" in pk["pending"]


# Recommend: best_scheme_id always a candidate; empty -> none
class TestRecommendRegression:
    def test_best_is_candidate(self):
        body = {"topics": ["farming"], "state": "WB", "mode": "both", "lang": "en",
                "answers": {"occupation": ["farmer"], "land": "owner", "taxpayer": "no"}}
        m = requests.post(f"{BASE_URL}/api/match", json=body, timeout=20).json()
        top5 = {r["scheme_id"] for r in m["results"][:5]}
        d = requests.post(f"{BASE_URL}/api/recommend", json=body, timeout=90).json()
        print("source", d.get("source"), d.get("ai_reason"))
        assert d["source"] in ("ai", "rules")
        assert d["best_scheme_id"] in top5

    def test_scheme_ids_narrow(self):
        body = {"topics": ["farming"], "state": "WB", "mode": "both", "lang": "en", "scheme_ids": ["pmfby"],
                "answers": {"occupation": ["farmer"], "land": "owner", "taxpayer": "no"}}
        d = requests.post(f"{BASE_URL}/api/recommend", json=body, timeout=90).json()
        assert d["best_scheme_id"] == "pmfby"

    def test_no_candidates(self):
        body = {"topics": ["farming"], "state": "WB", "mode": "both", "lang": "en",
                "answers": {"occupation": ["student"]}}
        d = requests.post(f"{BASE_URL}/api/recommend", json=body, timeout=90).json()
        assert d["source"] == "none"
