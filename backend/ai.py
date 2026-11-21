"""Server-side Gemini access. The key is read only from GEMINI_API_KEY and never logged or returned."""
import asyncio
import logging
import os
from typing import List, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel

log = logging.getLogger("ai")
_clients: dict = {}


class AIUnavailable(Exception):
    pass


class AIFailed(Exception):
    pass


def ai_configured() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY"))


def _client():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise AIUnavailable()
    if key not in _clients:
        _clients.clear()
        _clients[key] = genai.Client(api_key=key)
    return _clients[key]


def model_chain() -> List[str]:
    extra = [m.strip() for m in os.environ.get("GEMINI_FALLBACK_MODELS", "").split(",") if m.strip()]
    return [os.environ["GEMINI_MODEL"], *[m for m in extra if m != os.environ["GEMINI_MODEL"]]]


async def gemini_json(system: str, prompt: str, schema):
    client = _client()
    config = types.GenerateContentConfig(system_instruction=system, temperature=0.2,
                                         response_mime_type="application/json", response_schema=schema)
    for model in model_chain():
        try:
            resp = await asyncio.wait_for(client.aio.models.generate_content(model=model, contents=prompt, config=config), timeout=60)
            return schema.model_validate_json(resp.text)
        except Exception as exc:
            log.warning("Gemini call failed on %s: %s", model, type(exc).__name__)
    raise AIFailed()


class Alternative(BaseModel):
    scheme_id: str
    reason: str


class Recommendation(BaseModel):
    best_scheme_id: str
    headline: str
    why: List[str]
    still_to_check: List[str]
    alternatives: List[Alternative]
    comparison_note: str
    follow_up_question: Optional[str] = None


class GlossaryItem(BaseModel):
    term: str
    meaning: str


class Explanation(BaseModel):
    summary: str
    description: str
    benefits: str
    eligibility: List[str]
    exclusions: List[str]
    documents: List[str]
    steps: List[str]
    glossary: List[GlossaryItem]


LANG_NAMES = {"en": "simple English", "hi": "simple Hindi (Devanagari script)", "bn": "simple Bengali (Bangla script)"}

GROUNDING = (
    "You help people in India understand government welfare schemes. Use ONLY the scheme records given to you. "
    "Never invent schemes, amounts, eligibility rules, deadlines, documents or links. If a fact is missing, say it is "
    "'not confirmed' and that the official department should be checked. Keep official scheme names and document titles "
    "as published (you may add a short explanation in brackets). Never promise approval: use phrases like 'may be suitable' "
    "or 'best match based on your answers'. The official department decides final eligibility and rules can change. "
    "Write short sentences in plain everyday language for people with little technical knowledge."
)

RECOMMEND_SYSTEM = GROUNDING + (
    " Task: pick the best match among the candidate schemes for this person, based only on their bucketed answers and the "
    "published criteria. In 'why', explicitly link each user answer to the published criterion it satisfies. In "
    "'still_to_check', list unanswered or uncertain criteria and any rules that need official confirmation. If a record's "
    "source_status is not 'verified', mention that its details still need to be confirmed. best_scheme_id and alternative "
    "scheme_id values MUST be ids from the candidates. If an important answer is missing, set follow_up_question to one "
    "short question; otherwise null."
)

EXPLAIN_SYSTEM = GROUNDING + (
    " Task: rewrite the given official scheme record in the requested language, in plain words. Keep every list item "
    "(same number and order). Do not add new facts. Add up to 5 glossary items explaining government terms that appear."
)
