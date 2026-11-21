"""Deterministic, explainable matching of bucketed answers against published scheme criteria."""
from typing import Any, Dict, Iterable, List, Literal, Optional, Tuple, Union

AGE: Dict[str, Tuple[int, int]] = {"under_14": (0, 13), "14_17": (14, 17), "18_25": (18, 25), "26_40": (26, 40),
                                   "41_59": (41, 59), "60_69": (60, 69), "70_plus": (70, 120)}
INCOME: Dict[str, Tuple[int, int]] = {"below_1l": (0, 100000), "1l_2_5l": (100001, 250000), "2_5l_5l": (250001, 500000),
                                      "5l_9l": (500001, 900000), "above_9l": (900001, 10**10)}
UNKNOWN: set = {"not_sure", "prefer_not", "skip"}

ANSWER_OPTIONS: Dict[str, List[str]] = {
    "age": list(AGE),
    "gender": ["female", "male", "other"],
    "area": ["rural", "urban"],
    "income": list(INCOME),
    "occupation": ["student", "farmer", "business", "artisan", "worker", "salaried",
                   "job_seeker", "homemaker", "retired", "other"],
    "category": ["general", "obc", "sc", "st", "minority"],
    "disability": ["yes", "no"],
    "education": ["up_to_8", "class_9_10", "class_11_12", "college", "not_studying"],
    "land": ["owner", "tenant", "no_land"],
    "house": ["pucca", "kutcha", "no_house"],
    "taxpayer": ["yes", "no"],
    "business_stage": ["new", "existing"],
    "girl_child": ["yes", "no"],
}
MULTI: set = {"occupation"}
RULE_KEYS: List[str] = [k for k in ANSWER_OPTIONS if k not in ("age", "income")]
TOPICS: List[str] = ["study", "farming", "business", "jobs", "health", "housing", "family"]

Status = Literal["met", "pending", "fail"]
Answer = Union[str, List[str]]


def validate_answers(answers: Dict[str, Any]) -> Dict[str, Answer]:
    clean: Dict[str, Answer] = {}
    for key, value in answers.items():
        if key not in ANSWER_OPTIONS:
            raise ValueError(f"Unknown question: {key}")
        allowed = set(ANSWER_OPTIONS[key]) | UNKNOWN
        if key in MULTI:
            if not isinstance(value, list) or not all(isinstance(v, str) and v in allowed for v in value):
                raise ValueError(f"Invalid answer for {key}")
            clean[key] = list(dict.fromkeys(value))
        else:
            if not isinstance(value, str) or value not in allowed:
                raise ValueError(f"Invalid answer for {key}")
            clean[key] = value
    return clean


def _known_values(value: Optional[Answer]) -> List[str]:
    vals = value if isinstance(value, list) else [value] if value else []
    return [v for v in vals if v and v not in UNKNOWN]


def _range_status(user_rng: Tuple[int, int], lo: int, hi: int) -> Status:
    ulo, uhi = user_rng
    if ulo >= lo and uhi <= hi:
        return "met"
    if uhi < lo or ulo > hi:
        return "fail"
    return "pending"


def _age_status(c: dict, answers: dict) -> Status:
    vals = _known_values(answers.get("age"))
    return "pending" if not vals else _range_status(AGE[vals[0]], c.get("age_min") or 0, c.get("age_max") or 200)


def _income_status(c: dict, answers: dict) -> Status:
    vals = _known_values(answers.get("income"))
    return "pending" if not vals else _range_status(INCOME[vals[0]], 0, c["income_max"])


def _rule_status(answer: Optional[Answer], allowed: Iterable[str]) -> Status:
    vals = _known_values(answer)
    if not vals:
        return "pending"
    return "met" if set(vals) & set(allowed) else "fail"


def _iter_criteria_statuses(c: dict, answers: dict) -> Iterable[Tuple[Status, str]]:
    """Yield (status, code) for each applicable criterion in the scheme."""
    if c.get("age_min") is not None or c.get("age_max") is not None:
        yield _age_status(c, answers), "age"
    if c.get("income_max") is not None:
        yield _income_status(c, answers), "income"
    for key, allowed in (c.get("rules") or {}).items():
        if allowed:
            yield _rule_status(answers.get(key), allowed), key
    if c.get("list_based"):
        yield "pending", "official_list"


def evaluate(scheme: dict, answers: dict) -> Dict[str, List[str]]:
    out: Dict[str, List[str]] = {"met": [], "pending": [], "fail": []}
    for status, code in _iter_criteria_statuses(scheme.get("criteria") or {}, answers):
        out[status].append(code)
    return out


def _in_scope(s: dict, topics: List[str], state: Optional[str], mode: str) -> bool:
    if s["jurisdiction"] == "state" and (mode != "both" or not state or state not in s.get("states", [])):
        return False
    return not topics or "all" in topics or any(t in topics for t in s.get("topics", []))


def _score(s: dict, topic_hits: list, ev: dict) -> int:
    score = (40 if topic_hits else 10) + 15 * len(ev["met"]) - 4 * len(ev["pending"])
    score += 6 if s["jurisdiction"] == "state" else 0
    return score + (3 if s.get("source_status") == "verified" else 0)


def _result_for(s: dict, topics: List[str], answers: dict) -> Tuple[Optional[dict], Optional[dict]]:
    """Return (result, excluded) for one scheme — exactly one of them is populated."""
    topic_hits = [t for t in s.get("topics", []) if t in topics]
    ev = evaluate(s, answers)
    if ev["fail"]:
        return None, {"id": s["id"], "name": s["name"], "failed": ev["fail"]}
    return {
        "scheme_id": s["id"], "score": _score(s, topic_hits, ev),
        "level": "strong" if ev["met"] and not ev["pending"] else "possible",
        "topic_hits": topic_hits, "met": ev["met"], "pending": ev["pending"],
    }, None


def match(schemes: List[dict], topics: List[str], state: Optional[str], mode: str,
          answers: Dict[str, Answer]) -> Tuple[List[dict], List[dict]]:
    results: List[dict] = []
    excluded: List[dict] = []
    for s in (s for s in schemes if _in_scope(s, topics, state, mode)):
        result, bad = _result_for(s, topics, answers)
        (excluded if bad else results).append(bad or result)
    results.sort(key=lambda r: -r["score"])
    return results, excluded
