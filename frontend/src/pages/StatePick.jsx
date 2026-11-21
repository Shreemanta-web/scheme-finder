import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Search, Landmark, MapPin } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { STATES, UTS, regionName } from "@/lib/states";
import { PageWrap, PageTitle, StepHeader, StickyActions } from "@/components/Flow";
import { VoiceInput } from "@/components/Speech";

const norm = (s) => s.toLowerCase().normalize("NFC").replace(/\s+/g, " ").trim();

function RegionList({ title, items, value, onPick, lang }) {
  if (!items.length) return null;
  return (
    <section className="mt-6">
      <h2 className="eyebrow mb-3 text-[#52525B]">{title}</h2>
      <div role="radiogroup" aria-label={title} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => (
          <button key={r.code} role="radio" aria-checked={value === r.code} onClick={() => onPick(r.code)} data-testid={`state-option-${r.code}`} className="option min-h-[52px] py-3">
            <span className="flex-1 font-medium">{r.name[lang]}</span>
            {value === r.code && <span className="grid h-6 w-6 place-items-center rounded-full bg-[#C6F432]" aria-hidden><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function StatePick() {
  const { t, lang, flow, setFlow } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [error, setError] = useState(false);
  const filter = (list) => {
    const n = norm(q);
    return n ? list.filter((r) => Object.values(r.name).some((nm) => norm(nm).includes(n)) || r.code.toLowerCase() === n) : list;
  };
  const states = useMemo(() => filter(STATES), [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const uts = useMemo(() => filter(UTS), [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMode = (mode) => { setError(false); setFlow({ mode, results: null }); };
  const pick = (code) => { setError(false); setFlow({ state: code, mode: "both", results: null }); };
  const next = () => (flow.mode === "central" || flow.state ? navigate("/questions") : setError(true));
  const backTo = flow.topics?.includes("all") ? "/language" : "/topics";

  return (
    <PageWrap>
      <StepHeader step={3} backTo={backTo} />
      <PageTitle title={t("state.title")} subtitle={t("state.subtitle")} />

      <fieldset className="mb-8">
        <legend className="mb-3 font-medium">{t("state.modeLabel")}</legend>
        <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
          {[["both", MapPin, "state.modeBoth"], ["central", Landmark, "state.modeCentral"]].map(([m, Icon, key]) => (
            <button key={m} role="radio" aria-checked={flow.mode === m} onClick={() => setMode(m)} data-testid={`jurisdiction-toggle-${m}`} className="option">
              <Icon className="h-5 w-5 shrink-0" aria-hidden /><span className="flex-1 font-medium">{t(key)}</span>
              {flow.mode === m && <span className="grid h-6 w-6 place-items-center rounded-full bg-[#C6F432]" aria-hidden><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>}
            </button>
          ))}
        </div>
      </fieldset>

      {flow.mode === "both" && (
        <>
          <div className="flex items-center gap-2">
            <label className="relative flex-1">
              <span className="sr-only">{t("state.search")}</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#71717A]" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("state.search")} data-testid="state-search-input"
                className="h-14 w-full rounded-2xl border-2 border-[#E4E4E0] bg-white pl-12 pr-4 text-base outline-none transition-colors focus:border-[#0B0B0C]" />
            </label>
            <VoiceInput onResult={setQ} />
          </div>
          {flow.state && <p data-testid="state-chosen" className="mt-3 text-sm font-medium">{t("state.chosen", { name: regionName(flow.state, lang) })}</p>}
          <RegionList title={t("state.states")} items={states} value={flow.state} onPick={pick} lang={lang} />
          <RegionList title={t("state.uts")} items={uts} value={flow.state} onPick={pick} lang={lang} />
          {!states.length && !uts.length && <p data-testid="state-no-results" className="mt-6 text-[#52525B]">{t("state.noResults")}</p>}
        </>
      )}

      <StickyActions>
        {error && <p role="alert" data-testid="state-error" className="mr-auto text-sm font-medium text-red-700">{t("state.errorNone")}</p>}
        <button onClick={next} data-testid="state-continue-btn" className="btn-lime">{t("common.continue")}</button>
      </StickyActions>
    </PageWrap>
  );
}
