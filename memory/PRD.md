# Scheme Saathi — PRD

## Original problem statement
Mobile-first web app to discover Indian government welfare schemes (Central + State/UT) for students, farmers, business owners, workers, families etc. Flow: Welcome → Language (EN/HI/BN, whole UI) → Topics (multi) → State/UT (all 36, searchable) → one-question-per-screen questionnaire → results (filters/sort, why it appeared) → compare → scheme details (source + last-checked on every page) → grounded Gemini recommendation ("Best match based on your answers") → document checklist + official links. Help/FAQ, Privacy, Admin scheme management. Gemini only server-side via `GEMINI_API_KEY`. Palette #0B0B0C / #FFFFFF / #C6F432. No fabricated data; unverified data clearly labelled.

## User choices
- Own Gemini key (`GEMINI_API_KEY`, Emergent secrets). Model via `GEMINI_MODEL` (gemini-3.8-flash) + `GEMINI_FALLBACK_MODELS` (3.7-flash, 3.5-flash)
- Catalogue seeded with 21 well-known real schemes, all "Needs verification", last checked = not yet
- Emergent-managed Google sign-in (Clerk); ADMIN_EMAIL = shreemantamondal47@gmail.com
- Optional account to save schemes (signed-out → device localStorage; sign-in merges)

## Architecture
- Backend FastAPI: `server.py` (routes, models, roles), `matching.py` (deterministic bucketed criteria matching → met/pending/fail codes), `ai.py` (Gemini JSON structured output, grounding prompts, 45s deadline across model chain), `seed_data.py`, `clerk_auth.py`
- Mongo collections: schemes, explanations (AI cache keyed by scheme+lang+version), users, saved
- Frontend React: i18n dictionaries (en/hi/bn), AppContext (lang in localStorage, flow answers in sessionStorage only), pages for all 12 screens, Web Speech read-aloud + voice search

## Implemented (2026-06)
- Full flow end-to-end, all 12 screens, EN/HI/BN UI, AI explanations of scheme records in HI/BN (cached), AI recommendation grounded in catalogue with rules fallback
- Compare table, document checklist, save/share, admin CRUD/verify/archive/restore/translations/criteria builder, users & roles page
- Privacy: no Aadhaar/bank/doc fields, only bucketed answers sent to Gemini, logs exclude bodies
- Tested: iteration 1 & 2 (all fixes verified)

## Code quality refactor (2026-11)
- `server.py`: `_ai_recommendation` now explicitly initialises `rec=None`; `recommend()` split into `_rank_candidates` + `_ai_response` helpers to lower complexity
- `matching.py`: full type hints added; `evaluate()` extracted `_iter_criteria_statuses`; `match()` extracted `_result_for` to reduce branching
- `seed_data.py`: `scheme()` now accepts optional fields (states, mode, exclusions, criteria, application_url) via `**opts` — signature reduced from 19 to 14 params; two seed call sites updated to pass application_url as kwarg
- `tests/test_scheme_saathi_api.py`: `test_crud_flow` split into 5 focused tests; `is True` → `== True` on 4 assertions
- Verified: iteration 3 — 36/37 existing tests pass + 13/13 new regression tests pass; one unrelated AI test fails due to Gemini 429 quota (pre-existing environment issue)

## Known issue
- User's Gemini key currently returns 429 quota exhausted → app falls back to rules-based suggestions and English text for uncached schemes

## Backlog
- P1: Admin verify real records against official sources; reviewed hi/bn translations per scheme
- P1: More State/UT schemes for all 36 regions
- P2: Printable/WhatsApp-shareable checklist; CSC locator; deadline reminders
