import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Pencil, Sparkles, SearchX, Scale } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { http } from "@/lib/api";
import { loc } from "@/i18n";
import { regionName } from "@/lib/states";
import SchemeCard from "@/components/SchemeCard";
import { PageWrap, Disclaimer } from "@/components/Flow";
import { Loading, ErrorState } from "@/components/States";

function Chips({ label, options, value, onChange, testPrefix }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-medium text-[#52525B]">{label}</span>
      {options.map(([v, text]) => (
        <button key={v} aria-pressed={value === v} onClick={() => onChange(v)} data-testid={`${testPrefix}-${v}`} className="chip">{text}</button>
      ))}
    </div>
  );
}

function CompareTray({ ids, results, onClear }) {
  const { t, lang } = useApp();
  const navigate = useNavigate();
  if (!ids.length) return null;
  const picked = results.filter((r) => ids.includes(r.scheme_id));
  const topicSets = picked.map((r) => new Set(r.scheme.topics));
  const mixed = picked.length > 1 && !picked[0].scheme.topics.some((tp) => topicSets.every((s) => s.has(tp)));
  return (
    <div role="region" aria-label={t("a11y.compareTray")} data-testid="compare-tray" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0B0B0C] text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Scale className="h-5 w-5 text-[#C6F432]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" data-testid="compare-count">{t("results.compareCount", { n: ids.length })}</p>
          <p className="truncate text-xs text-white/60">{picked.map((r) => loc(r.scheme.name, lang)).join(" · ")}</p>
          {mixed && <p className="text-xs text-amber-200" data-testid="compare-mixed-warning">{t("results.compareSimilar")}</p>}
          {ids.length < 2 && <p className="text-xs text-white/60">{t("results.compareMin")}</p>}
        </div>
        <button onClick={onClear} data-testid="compare-clear-btn" className="btn-ghost-dark min-h-[44px] text-sm">{t("results.clear")}</button>
        <button disabled={ids.length < 2} onClick={() => navigate(`/compare?ids=${ids.join(",")}`)} data-testid="compare-open-tray-btn" className="btn-lime min-h-[44px]">{t("results.compareNow")}</button>
      </div>
    </div>
  );
}

export default function Results() {
  const { t, lang, flow, setFlow } = useApp();
  const navigate = useNavigate();
  const [status, setStatus] = useState(flow.results ? "ok" : "loading");
  const [jur, setJur] = useState("all");
  const [type, setType] = useState("all");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState("relevance");
  const [showHidden, setShowHidden] = useState(false);

  const load = async () => {
    setStatus("loading");
    try {
      const [{ data }] = await Promise.all([
        http.post("/match", { topics: flow.topics, state: flow.mode === "central" ? null : flow.state, mode: flow.mode, answers: flow.answers }),
        new Promise((r) => setTimeout(r, 600)),
      ]);
      setFlow({ results: data.results, excluded: data.excluded, compare: (flow.compare || []).filter((id) => data.results.some((r) => r.scheme_id === id)) });
      setStatus("ok");
    } catch { setStatus("error"); }
  };
  useEffect(() => { if (!flow.results) load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const results = flow.results || [];
  const types = [...new Set(results.map((r) => r.scheme.benefit_type))];
  const shown = useMemo(() => {
    let list = results.filter((r) => (jur === "all" || r.scheme.jurisdiction === jur) && (type === "all" || r.scheme.benefit_type === type) && (level === "all" || r.level === level));
    if (sort === "name") list = [...list].sort((a, b) => loc(a.scheme.name, lang).localeCompare(loc(b.scheme.name, lang)));
    if (sort === "checked") list = [...list].sort((a, b) => (b.scheme.last_checked || "").localeCompare(a.scheme.last_checked || ""));
    return list;
  }, [results, jur, type, level, sort, lang]);

  const toggleCompare = (id) => {
    const cur = flow.compare || [];
    if (!cur.includes(id) && cur.length >= 4) return toast.info(t("results.compareMax"));
    setFlow({ compare: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };
  const broaden = () => { setFlow({ topics: ["all"], mode: flow.state ? "both" : flow.mode, results: null }); setTimeout(load, 0); };

  if (status === "loading") return <Loading text={t("results.loading")} />;
  if (status === "error") return <ErrorState onRetry={load} />;

  const topicsLabel = flow.topics?.includes("all") || !flow.topics?.length ? t("topics.all") : flow.topics.map((tp) => t(`topics.${tp}`)).join(", ");
  const stateLabel = flow.mode === "central" || !flow.state ? t("state.modeCentral") : `${t("common.central")} + ${regionName(flow.state, lang)}`;

  return (
    <PageWrap className={flow.compare?.length ? "pb-32" : ""}>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 inline-flex rounded-full bg-[#0B0B0C] px-3 py-1 text-sm font-semibold text-[#C6F432]" data-testid="results-count-badge">{t("results.count", { n: results.length })}</p>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t("results.title")}</h1>
        </div>
        {results.length > 0 && (
          <Link to={`/recommendation${flow.compare?.length > 1 ? `?ids=${flow.compare.join(",")}` : ""}`} data-testid="results-recommend-btn" className="btn-lime">
            <Sparkles className="h-4 w-4" aria-hidden />{t("results.recommend")}
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label={t("results.yourChoices")}>
        {[["/topics", t("results.editTopics"), topicsLabel, "edit-topics"], ["/state", t("results.editState"), stateLabel, "edit-state"], ["/questions", t("results.changeAnswers"), "", "edit-answers"]].map(([to, label, value, id]) => (
          <Link key={id} to={to} data-testid={`results-${id}-btn`} className="chip max-w-full">
            <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate">{label}{value && `: ${value}`}</span>
          </Link>
        ))}
      </div>
      <Disclaimer className="mb-6" />

      {results.length === 0 ? (
        <div data-testid="results-empty" className="surface flex flex-col items-start gap-4 p-8">
          <SearchX className="h-8 w-8" aria-hidden />
          <h2 className="font-display text-2xl font-semibold">{t("results.emptyTitle")}</h2>
          <p className="max-w-xl text-[#52525B]">{t("results.emptyBody")}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={broaden} data-testid="results-broaden-btn" className="btn-lime">{t("results.broaden")}</button>
            <button onClick={() => navigate("/state")} data-testid="results-change-state-btn" className="btn-ghost">{t("results.changeState")}</button>
            <button onClick={() => navigate("/questions")} data-testid="results-change-answers-btn" className="btn-ghost">{t("results.changeAnswers")}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="surface mb-6 grid gap-4 p-4 sm:p-5" data-testid="results-filters">
            <Chips label={t("results.jurisdiction")} value={jur} onChange={setJur} testPrefix="filter-jur" options={[["all", t("results.all")], ["central", t("common.centralShort")], ["state", t("common.stateScheme")]]} />
            <Chips label={t("results.benefitType")} value={type} onChange={setType} testPrefix="filter-type" options={[["all", t("results.all")], ...types.map((ty) => [ty, t(`results.types.${ty}`)])]} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Chips label={t("results.level")} value={level} onChange={setLevel} testPrefix="filter-level" options={[["all", t("results.all")], ["strong", t("results.strong")], ["possible", t("results.possible")]]} />
              <label className="flex items-center gap-2 text-sm font-medium text-[#52525B]">{t("results.sort")}
                <select value={sort} onChange={(e) => setSort(e.target.value)} data-testid="results-sort-select" className="h-10 rounded-full border border-[#DADAD4] bg-white px-3 text-[#0B0B0C]">
                  <option value="relevance">{t("results.sortRelevance")}</option><option value="name">{t("results.sortName")}</option><option value="checked">{t("results.sortChecked")}</option>
                </select>
              </label>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2" data-testid="results-list">
            {shown.map((r) => <SchemeCard key={r.scheme_id} result={r} compared={(flow.compare || []).includes(r.scheme_id)} onCompare={toggleCompare} />)}
          </div>
        </>
      )}

      {flow.excluded?.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowHidden((s) => !s)} aria-expanded={showHidden} data-testid="results-hidden-toggle" className="chip">
            {t("results.hiddenTitle", { n: flow.excluded.length })}<ChevronDown className={`h-4 w-4 transition-transform ${showHidden ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {showHidden && (
            <div className="mt-3 rounded-2xl border border-[#E4E4E0] bg-white p-4 text-sm" data-testid="results-hidden-list">
              <p className="mb-2 text-[#52525B]">{t("results.hiddenBody")}</p>
              <ul className="grid gap-1.5">{flow.excluded.map((x) => <li key={x.id}><Link className="font-medium underline-offset-4 hover:underline" to={`/scheme/${x.id}`}>{loc(x.name, lang)}</Link> — {x.failed.map((c) => t(`crit.${c}.fail`)).join(", ")}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      <CompareTray ids={flow.compare || []} results={results} onClear={() => setFlow({ compare: [] })} />
    </PageWrap>
  );
}
