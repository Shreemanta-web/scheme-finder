"""Deterministic, explainable matching of bucketed answers against published scheme criteria."""

AGE = {"under_14": (0, 13), "14_17": (14, 17), "18_25": (18, 25), "26_40": (26, 40),
       "41_59": (41, 59), "60_69": (60, 69), "70_plus": (70, 120)}
INCOME = {"below_1l": (0, 100000), "1l_2_5l": (100001, 250000), "2_5l_5l": (250001, 500000),
          "5l_9l": (500001, 900000), "above_9l": (900001, 10**10)}
UNKNOWN = {"not_sure", "prefer_not", "skip"}

ANSWER_OPTIONS = {
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
MULTI = {"occupation"}
RULE_KEYS = [k for k in ANSWER_OPTIONS if k not in ("age", "income")]
TOPICS = ["study", "farming", "business", "jobs", "health", "housing", "family"]


def validate_answers(answers: dict) -> dict:
    clean = {}
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


def _known_values(value):
    vals = value if isinstance(value, list) else [value]
    return [v for v in vals if v and v not in UNKNOWN]


def _range_status(user_rng, lo, hi):
    ulo, uhi = user_rng
    if ulo >= lo and uhi <= hi:
        return "met"
    if uhi < lo or ulo > hi:
        return "fail"
    return "pending"


def evaluate(scheme: dict, answers: dict):
    c = scheme.get("criteria") or {}
    out = {"met": [], "pending": [], "fail": []}
    if c.get("age_min") is not None or c.get("age_max") is not None:
        vals = _known_values(answers.get("age"))
        lo, hi = c.get("age_min") or 0, c.get("age_max") or 200
        out["pending" if not vals else _range_status(AGE[vals[0]], lo, hi)].append("age")
    if c.get("income_max") is not None:
        vals = _known_values(answers.get("income"))
        out["pending" if not vals else _range_status(INCOME[vals[0]], 0, c["income_max"])].append("income")
    for key, allowed in (c.get("rules") or {}).items():
        if not allowed:
            continue
        vals = _known_values(answers.get(key))
        if not vals:
            out["pending"].append(key)
        else:
            out["met" if set(vals) & set(allowed) else "fail"].append(key)
    if c.get("list_based"):
        out["pending"].append("official_list")
    return out


def match(schemes, topics, state, mode, answers):
    browse_all = not topics or "all" in topics
    results, excluded = [], []
    for s in schemes:
        if s["jurisdiction"] == "state" and (mode != "both" or not state or state not in s.get("states", [])):
            continue
        topic_hits = [t for t in s.get("topics", []) if t in topics]
        if not browse_all and not topic_hits:
            continue
        ev = evaluate(s, answers)
        if ev["fail"]:
            excluded.append({"id": s["id"], "name": s["name"], "failed": ev["fail"]})
            continue
        score = (40 if topic_hits else 10) + 15 * len(ev["met"]) - 4 * len(ev["pending"])
        score += 6 if s["jurisdiction"] == "state" else 0
        score += 3 if s.get("source_status") == "verified" else 0
        results.append({
            "scheme_id": s["id"], "score": score,
            "level": "strong" if ev["met"] and not ev["pending"] else "possible",
            "topic_hits": topic_hits, "met": ev["met"], "pending": ev["pending"],
        })
    results.sort(key=lambda r: -r["score"])
    return results, excluded
