import asyncio
import json
import logging
import os
import re
import time
import uuid
from contextlib import suppress
from datetime import datetime, timezone, date
from pathlib import Path
from typing import Dict, List, Literal, Optional, Union

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, field_validator
from pymongo import ASCENDING, IndexModel, ReturnDocument
from pymongo.errors import DuplicateKeyError
from starlette.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from ai import (EXPLAIN_SYSTEM, LANG_NAMES, RECOMMEND_SYSTEM, AIFailed, AIUnavailable, Explanation,  # noqa: E402
                Recommendation, ai_configured, gemini_json)
from clerk_auth import clerk_router, require_user  # noqa: E402
from matching import ANSWER_OPTIONS, RULE_KEYS, TOPICS, UNKNOWN, match, validate_answers  # noqa: E402
from seed_data import SEED_SCHEMES  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("scheme_saathi")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

INDEXES: dict[str, list[IndexModel]] = {
    "schemes": [IndexModel([("id", ASCENDING)], name="id", unique=True),
                IndexModel([("archived", ASCENDING), ("jurisdiction", ASCENDING)], name="archived_jur")],
    "users": [IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "saved": [IndexModel([("user_id", ASCENDING), ("scheme_id", ASCENDING)], name="user_scheme", unique=True)],
    "explanations": [IndexModel([("scheme_id", ASCENDING), ("lang", ASCENDING), ("version", ASCENDING)], name="sid_lang_ver", unique=True)],
}

LANGS = ("en", "hi", "bn")
BENEFIT_TYPES = ["cash", "insurance", "loan", "subsidy", "scholarship", "pension", "service", "training"]
STATE_CODES = ["AP", "AR", "AS", "BR", "CG", "GA", "GJ", "HR", "HP", "JH", "KA", "KL", "MP", "MH", "MN", "ML", "MZ", "NL",
               "OD", "PB", "RJ", "SK", "TN", "TS", "TR", "UP", "UK", "WB", "AN", "CH", "DN", "DL", "JK", "LA", "LD", "PY"]


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)


async def seed_catalogue() -> None:
    now = datetime.now(timezone.utc).isoformat()
    for s in SEED_SCHEMES:
        await db.schemes.update_one({"id": s["id"]}, {"$setOnInsert": {**s, "created_at": now, "updated_at": now, "seeded": True}}, upsert=True)


app = FastAPI(title="Scheme Saathi API")
api = APIRouter(prefix="/api")


@app.middleware("http")
async def access_log(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    # Path and status only: no bodies, query strings or personal answers are logged.
    logger.info("%s %s -> %s (%.0f ms)", request.method, request.url.path, response.status_code, (time.perf_counter() - start) * 1000)
    return response


# ---------- Models ----------
Localized = Dict[str, str]
LocalizedList = Dict[str, List[str]]


class Criteria(BaseModel):
    age_min: Optional[int] = Field(None, ge=0, le=120)
    age_max: Optional[int] = Field(None, ge=0, le=120)
    income_max: Optional[int] = Field(None, ge=0)
    rules: Dict[str, List[str]] = {}
    list_based: bool = False

    @field_validator("rules")
    @classmethod
    def _rules(cls, v):
        for key, vals in v.items():
            if key not in RULE_KEYS or any(x not in ANSWER_OPTIONS[key] for x in vals):
                raise ValueError(f"Invalid criteria rule: {key}")
        return {k: vals for k, vals in v.items() if vals}


class SchemeIn(BaseModel):
    name: Localized
    official_name: str = Field(min_length=2, max_length=200)
    department: Localized = {}
    jurisdiction: Literal["central", "state"]
    states: List[str] = []
    topics: List[str] = Field(min_length=1)
    benefit_type: str
    summary: Localized
    description: Localized = {}
    benefits: Localized
    eligibility: LocalizedList
    exclusions: LocalizedList = {}
    documents: LocalizedList
    steps: LocalizedList
    application_mode: Literal["online", "offline", "both"] = "online"
    application_url: str = ""
    official_url: str
    application_window: str = Field("", max_length=300)
    criteria: Criteria = Criteria()
    source_status: Literal["unverified", "verified", "needs_review"] = "unverified"
    last_checked: Optional[str] = None
    is_demo: bool = False

    @field_validator("name", "summary", "benefits")
    @classmethod
    def _loc_req(cls, v):
        if any(k not in LANGS for k in v) or not (v.get("en") or "").strip():
            raise ValueError("English text is required; languages must be en/hi/bn")
        return {k: s.strip() for k, s in v.items() if s and s.strip()}

    @field_validator("department", "description")
    @classmethod
    def _loc_opt(cls, v):
        if any(k not in LANGS for k in v):
            raise ValueError("Languages must be en/hi/bn")
        return {k: s.strip() for k, s in v.items() if s and s.strip()}

    @field_validator("eligibility", "exclusions", "documents", "steps")
    @classmethod
    def _lists(cls, v):
        if any(k not in LANGS for k in v):
            raise ValueError("Languages must be en/hi/bn")
        return {k: [i.strip() for i in items if i and i.strip()] for k, items in v.items()}

    @field_validator("topics")
    @classmethod
    def _topics(cls, v):
        if any(t not in TOPICS for t in v):
            raise ValueError("Unknown topic")
        return list(dict.fromkeys(v))

    @field_validator("states")
    @classmethod
    def _states(cls, v):
        if any(s not in STATE_CODES for s in v):
            raise ValueError("Unknown State/UT code")
        return v

    @field_validator("benefit_type")
    @classmethod
    def _btype(cls, v):
        if v not in BENEFIT_TYPES:
            raise ValueError("Unknown benefit type")
        return v

    @field_validator("official_url", "application_url")
    @classmethod
    def _url(cls, v):
        if v and not re.match(r"^https?://[^\s]+\.[^\s]+", v):
            raise ValueError("Links must be full web addresses starting with https://")
        return v

    @field_validator("last_checked")
    @classmethod
    def _date(cls, v):
        if v:
            date.fromisoformat(v)
        return v or None


class MatchIn(BaseModel):
    topics: List[str] = []
    state: Optional[str] = None
    mode: Literal["both", "central"] = "both"
    answers: Dict[str, Union[str, List[str]]] = {}

    @field_validator("topics")
    @classmethod
    def _topics(cls, v):
        if any(t not in TOPICS + ["all"] for t in v):
            raise ValueError("Unknown topic")
        return v

    @field_validator("state")
    @classmethod
    def _state(cls, v):
        if v and v not in STATE_CODES:
            raise ValueError("Unknown State/UT")
        return v

    @field_validator("answers")
    @classmethod
    def _answers(cls, v):
        return validate_answers(v)


class RecommendIn(MatchIn):
    lang: Literal["en", "hi", "bn"] = "en"
    scheme_ids: List[str] = Field([], max_length=6)


class IdsIn(BaseModel):
    ids: List[str] = Field(max_length=50)


class RoleIn(BaseModel):
    role: str


class ArchiveIn(BaseModel):
    archived: bool


# ---------- Helpers ----------
PUBLIC = {"_id": 0, "seeded": 0}


def translation_status(doc: dict) -> dict:
    out = {}
    for lang in ("hi", "bn"):
        fields = [doc.get("name", {}).get(lang), doc.get("summary", {}).get(lang), doc.get("benefits", {}).get(lang),
                  (doc.get("eligibility") or {}).get(lang), (doc.get("steps") or {}).get(lang)]
        filled = sum(1 for f in fields if f)
        out[lang] = "complete" if filled == len(fields) else ("partial" if filled else "missing")
    return out


def with_meta(doc: dict) -> dict:
    doc["translation_status"] = translation_status(doc)
    return doc


async def active_schemes(query: Optional[dict] = None) -> list:
    return await db.schemes.find({"archived": {"$ne": True}, **(query or {})}, PUBLIC).to_list(2000)


def card(doc: dict) -> dict:
    keys = ["id", "name", "official_name", "department", "jurisdiction", "states", "topics", "benefit_type", "summary",
            "application_mode", "source_status", "last_checked", "is_demo", "application_window", "official_url"]
    return {k: doc.get(k) for k in keys}


def answers_for_ai(answers: dict) -> dict:
    # Only bucketed, non-identifying values are ever shared with Gemini.
    return {k: (v if v not in UNKNOWN else "not answered") if isinstance(v, str)
            else [x for x in v if x not in UNKNOWN] or "not answered" for k, v in answers.items()}


def ai_fact_sheet(doc: dict, m: dict) -> dict:
    en = lambda f: (doc.get(f) or {}).get("en")  # noqa: E731
    return {
        "id": doc["id"], "name": en("name"), "official_name": doc.get("official_name"),
        "jurisdiction": doc["jurisdiction"], "states": doc.get("states"), "benefit_type": doc.get("benefit_type"),
        "summary": en("summary"), "benefits": en("benefits"), "eligibility": en("eligibility"),
        "exclusions": en("exclusions"), "documents": en("documents"), "application_mode": doc.get("application_mode"),
        "application_window": doc.get("application_window") or "Not confirmed",
        "source_status": doc.get("source_status"), "last_checked": doc.get("last_checked") or "Not checked yet",
        "criteria_met_by_answers": m.get("met", []), "criteria_not_yet_confirmed": m.get("pending", []),
    }


def rules_recommendation(ranked: list) -> dict:
    best = ranked[0]
    return {"source": "rules", "best_scheme_id": best["scheme_id"], "why_codes": best["met"], "topic_hits": best["topic_hits"],
            "pending_codes": best["pending"], "alternatives": [{"scheme_id": r["scheme_id"], "reason": None} for r in ranked[1:4]]}


# ---------- Public routes ----------
@api.get("/health")
async def health():
    return {"ok": True}


@api.get("/meta")
async def meta():
    return {"ai_available": ai_configured(), "topics": TOPICS, "benefit_types": BENEFIT_TYPES,
            "answer_options": ANSWER_OPTIONS, "rule_keys": RULE_KEYS, "state_codes": STATE_CODES}


@api.get("/schemes")
async def list_schemes(topic: Optional[str] = None, jurisdiction: Optional[Literal["central", "state"]] = None,
                       state: Optional[str] = None, q: Optional[str] = Query(None, max_length=80)):
    query: dict = {}
    if topic and topic != "all":
        query["topics"] = topic
    if jurisdiction:
        query["jurisdiction"] = jurisdiction
    if state:
        query["$or"] = [{"jurisdiction": "central"}, {"states": state}]
    docs = await active_schemes(query)
    if q:
        needle = q.lower()
        docs = [d for d in docs if needle in json.dumps([d.get("name"), d.get("official_name"), d.get("summary")], ensure_ascii=False).lower()]
    return [card(d) for d in docs]


@api.get("/schemes/{scheme_id}")
async def get_scheme(scheme_id: str):
    doc = await db.schemes.find_one({"id": scheme_id, "archived": {"$ne": True}}, PUBLIC)
    if not doc:
        raise HTTPException(404, "Scheme not found")
    return with_meta(doc)


@api.post("/schemes/batch")
async def schemes_batch(body: IdsIn):
    docs = await active_schemes({"id": {"$in": body.ids}})
    order = {i: n for n, i in enumerate(body.ids)}
    return [with_meta(d) for d in sorted(docs, key=lambda d: order.get(d["id"], 99))]


@api.post("/match")
async def match_route(body: MatchIn):
    docs = await active_schemes()
    ranked, excluded = match(docs, body.topics, body.state, body.mode, body.answers)
    by_id = {d["id"]: d for d in docs}
    return {"results": [{**r, "scheme": card(by_id[r["scheme_id"]])} for r in ranked], "excluded": excluded}


@api.get("/schemes/{scheme_id}/explain")
async def explain(scheme_id: str, lang: Literal["en", "hi", "bn"] = "hi"):
    doc = await db.schemes.find_one({"id": scheme_id, "archived": {"$ne": True}}, PUBLIC)
    if not doc:
        raise HTTPException(404, "Scheme not found")
    version = doc.get("updated_at", "")
    cached = await db.explanations.find_one({"scheme_id": scheme_id, "lang": lang, "version": version}, {"_id": 0})
    if cached:
        return {"available": True, "explanation": cached["explanation"]}
    if not ai_configured():
        return {"available": False, "reason": "not_configured"}
    key = (scheme_id, lang, version)
    if time.monotonic() < _EXPLAIN_FAILED.get(key, 0):
        return {"available": False, "reason": "failed"}
    if key not in _EXPLAIN_INFLIGHT:
        _EXPLAIN_INFLIGHT[key] = asyncio.ensure_future(_generate_explanation(doc, lang, version))
    try:
        data = await asyncio.shield(_EXPLAIN_INFLIGHT[key])
    finally:
        if _EXPLAIN_INFLIGHT.get(key) and _EXPLAIN_INFLIGHT[key].done():
            _EXPLAIN_INFLIGHT.pop(key, None)
    if data is None:
        _EXPLAIN_FAILED[key] = time.monotonic() + 120
        return {"available": False, "reason": "failed"}
    return {"available": True, "explanation": data}


_EXPLAIN_INFLIGHT: dict = {}
_EXPLAIN_FAILED: dict = {}


async def _generate_explanation(doc: dict, lang: str, version: str):
    en = lambda f: (doc.get(f) or {}).get("en") or ([] if f in ("eligibility", "exclusions", "documents", "steps") else "")  # noqa: E731
    record = {f: en(f) for f in ("name", "summary", "description", "benefits", "eligibility", "exclusions", "documents", "steps")}
    record["official_name"] = doc.get("official_name")
    prompt = f"Language: {LANG_NAMES[lang]}\nOfficial record (JSON):\n{json.dumps(record, ensure_ascii=False)}"
    try:
        result = await gemini_json(EXPLAIN_SYSTEM, prompt, Explanation)
    except (AIUnavailable, AIFailed):
        return None
    data = result.model_dump()
    with suppress(DuplicateKeyError):
        await db.explanations.update_one({"scheme_id": doc["id"], "lang": lang, "version": version},
                                         {"$set": {"explanation": data, "created_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return data


@api.post("/recommend")
async def recommend(body: RecommendIn):
    docs = await active_schemes()
    ranked, _ = match(docs, body.topics, body.state, body.mode, body.answers)
    if body.scheme_ids:
        wanted = set(body.scheme_ids)
        ranked = [r for r in ranked if r["scheme_id"] in wanted] or ranked
    ranked = ranked[:5]
    if not ranked:
        return {"source": "none"}
    by_id = {d["id"]: d for d in docs}
    candidates = [ai_fact_sheet(by_id[r["scheme_id"]], r) for r in ranked]
    base = {"candidates": [{**r, "scheme": card(by_id[r["scheme_id"]])} for r in ranked]}
    if not ai_configured():
        return {**rules_recommendation(ranked), **base, "ai_reason": "not_configured"}
    prompt = (f"Write the answer in {LANG_NAMES[body.lang]}.\nPerson's answers (bucketed, no identity):\n"
              f"{json.dumps(answers_for_ai(body.answers), ensure_ascii=False)}\nTopics chosen: {body.topics}\n"
              f"State/UT code: {body.state or 'not given'}; scope: {body.mode}\n"
              f"Candidate scheme records (JSON):\n{json.dumps(candidates, ensure_ascii=False)}")
    try:
        rec = await gemini_json(RECOMMEND_SYSTEM, prompt, Recommendation)
    except (AIUnavailable, AIFailed):
        return {**rules_recommendation(ranked), **base, "ai_reason": "failed"}
    ids = {c["id"] for c in candidates}
    if rec.best_scheme_id not in ids:
        return {**rules_recommendation(ranked), **base, "ai_reason": "failed"}
    best = next(r for r in ranked if r["scheme_id"] == rec.best_scheme_id)
    return {"source": "ai", **rec.model_dump(), "alternatives": [a.model_dump() for a in rec.alternatives if a.scheme_id in ids and a.scheme_id != rec.best_scheme_id],
            "pending_codes": best["pending"], **base}


# ---------- Users & roles ----------
ROLES = ["admin", "member"]
DEFAULT_ROLE = "member"
RETIRED_ROLES: dict = {}
RANK = {r: len(ROLES) - i for i, r in enumerate(ROLES)}
ENV = "live" if os.environ.get("CLERK_PUBLISHABLE_KEY", "").startswith("pk_live_") else "preview"
IN_ENV = {"env": {"$in": [ENV, None]}}


def effective_role(role) -> str:
    role = RETIRED_ROLES.get(role, role)
    return role if role in ROLES else DEFAULT_ROLE


def _clerk_identity(user_id: str):
    admins = {e.strip().lower() for e in os.environ.get("ADMIN_EMAIL", "").split(",") if e.strip()}
    r = requests.get(f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
                     headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "emergent-app"})
    r.raise_for_status()
    emails = r.json()["email_addresses"]
    is_admin = any(e["email_address"].lower() in admins and (e.get("verification") or {}).get("status") == "verified" for e in emails)
    return is_admin, (emails[0]["email_address"] if emails else "")


async def current_member(user: dict = Depends(require_user)) -> dict:
    uid = user["user_id"]
    member = await db.users.find_one({"user_id": uid}, {"_id": 0})
    if member is None or not member.get("role"):
        is_admin, email = await run_in_threadpool(_clerk_identity, uid)
        role = "admin" if is_admin else DEFAULT_ROLE
        await db.users.update_one({"user_id": uid, "role": {"$in": [None, ""]}}, {"$set": {"role": role, "email": email}})
        member = await db.users.find_one_and_update(
            {"user_id": uid}, {"$setOnInsert": {"user_id": uid, "role": role, "email": email, "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if member.get("env") != ENV:
        await db.users.update_one({"user_id": uid}, {"$set": {"env": ENV}})
    return {**member, "env": ENV, "role": effective_role(member["role"])}


def require_role(*roles: str):
    async def check(member: dict = Depends(current_member)) -> dict:
        if member["role"] not in roles:
            raise HTTPException(status_code=403, detail="Not allowed")
        return member
    return check


@api.get("/me")
async def me(member: dict = Depends(current_member)):
    return {"user_id": member["user_id"], "role": member["role"], "email": member.get("email", "")}


@api.get("/me/saved")
async def my_saved(member: dict = Depends(current_member)):
    rows = await db.saved.find({"user_id": member["user_id"]}, {"_id": 0}).to_list(500)
    return {"ids": [r["scheme_id"] for r in rows]}


@api.post("/me/saved/merge")
async def merge_saved(body: IdsIn, member: dict = Depends(current_member)):
    valid = {d["id"] for d in await db.schemes.find({"id": {"$in": body.ids}, "archived": {"$ne": True}}, {"_id": 0, "id": 1}).to_list(100)}
    for sid in valid:
        await db.saved.update_one({"user_id": member["user_id"], "scheme_id": sid},
                                  {"$setOnInsert": {"saved_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return await my_saved(member)


@api.post("/me/saved/{scheme_id}")
async def save_scheme(scheme_id: str, member: dict = Depends(current_member)):
    if not await db.schemes.find_one({"id": scheme_id, "archived": {"$ne": True}}, {"_id": 1}):
        raise HTTPException(404, "Scheme not found")
    await db.saved.update_one({"user_id": member["user_id"], "scheme_id": scheme_id},
                              {"$setOnInsert": {"saved_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return {"ok": True}


@api.delete("/me/saved/{scheme_id}")
async def unsave_scheme(scheme_id: str, member: dict = Depends(current_member)):
    await db.saved.delete_one({"user_id": member["user_id"], "scheme_id": scheme_id})
    return {"ok": True}


@api.delete("/me/saved")
async def clear_saved(member: dict = Depends(current_member)):
    await db.saved.delete_many({"user_id": member["user_id"]})
    return {"ok": True}


@api.get("/users")
async def list_users(admin: dict = Depends(require_role("admin"))):
    people = await db.users.find(IN_ENV, {"_id": 0}).to_list(1000)
    return {"roles": [r for r in ROLES if RANK[r] <= RANK[admin["role"]]],
            "users": [{**p, "role": effective_role(p.get("role"))} for p in people]}


@api.patch("/users/{user_id}/role")
async def set_role(user_id: str, body: RoleIn, admin: dict = Depends(require_role("admin"))):
    if body.role not in ROLES or RANK[body.role] > RANK[admin["role"]]:
        raise HTTPException(status_code=403, detail="Not allowed")
    target = await db.users.find_one({"user_id": user_id, **IN_ENV}, {"_id": 0})
    if target is None:
        raise HTTPException(status_code=404, detail="Not found")
    if (effective_role(target.get("role")) == "admin" and body.role != "admin"
            and await db.users.count_documents({"role": "admin", **IN_ENV}) <= 1):
        raise HTTPException(status_code=409, detail="Keep at least one admin")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": body.role}})
    return {"user_id": user_id, "role": body.role}


# ---------- Admin scheme management ----------
@api.get("/admin/system")
async def admin_system(admin: dict = Depends(require_role("admin"))):
    return {"gemini_configured": ai_configured(), "gemini_model": os.environ.get("GEMINI_MODEL", "")}


@api.get("/admin/schemes")
async def admin_list(admin: dict = Depends(require_role("admin"))):
    docs = await db.schemes.find({}, PUBLIC).sort("id", 1).to_list(2000)
    return [with_meta(d) for d in docs]


def _slug(text: str) -> str:
    return (re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40] or "scheme") + "-" + uuid.uuid4().hex[:5]


@api.post("/admin/schemes")
async def admin_create(body: SchemeIn, admin: dict = Depends(require_role("admin"))):
    now = datetime.now(timezone.utc).isoformat()
    doc = {**body.model_dump(), "id": _slug(body.name["en"]), "archived": False, "created_at": now, "updated_at": now,
           "updated_by": admin.get("email", "")}
    if doc["jurisdiction"] == "central":
        doc["states"] = []
    await db.schemes.insert_one(doc)
    return with_meta({k: v for k, v in doc.items() if k != "_id"})


@api.put("/admin/schemes/{scheme_id}")
async def admin_update(scheme_id: str, body: SchemeIn, admin: dict = Depends(require_role("admin"))):
    data = body.model_dump()
    if data["jurisdiction"] == "central":
        data["states"] = []
    data.update(updated_at=datetime.now(timezone.utc).isoformat(), updated_by=admin.get("email", ""))
    doc = await db.schemes.find_one_and_update({"id": scheme_id}, {"$set": data}, projection=PUBLIC, return_document=ReturnDocument.AFTER)
    if not doc:
        raise HTTPException(404, "Scheme not found")
    return with_meta(doc)


@api.post("/admin/schemes/{scheme_id}/verify")
async def admin_verify(scheme_id: str, admin: dict = Depends(require_role("admin"))):
    now = datetime.now(timezone.utc)
    doc = await db.schemes.find_one_and_update(
        {"id": scheme_id}, {"$set": {"source_status": "verified", "last_checked": now.date().isoformat(),
                                     "verified_by": admin.get("email", ""), "updated_at": now.isoformat()}},
        projection=PUBLIC, return_document=ReturnDocument.AFTER)
    if not doc:
        raise HTTPException(404, "Scheme not found")
    return with_meta(doc)


@api.post("/admin/schemes/{scheme_id}/archive")
async def admin_archive(scheme_id: str, body: ArchiveIn, admin: dict = Depends(require_role("admin"))):
    doc = await db.schemes.find_one_and_update(
        {"id": scheme_id}, {"$set": {"archived": body.archived, "updated_at": datetime.now(timezone.utc).isoformat()}},
        projection=PUBLIC, return_document=ReturnDocument.AFTER)
    if not doc:
        raise HTTPException(404, "Scheme not found")
    return with_meta(doc)


app.include_router(api)
app.include_router(clerk_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    for old, new in RETIRED_ROLES.items():
        await db.users.update_many({"role": old}, {"$set": {"role": new}})
    await seed_catalogue()
    app.state.index_task = asyncio.create_task(ensure_indexes())


@app.on_event("shutdown")
async def shutdown_db_client():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
