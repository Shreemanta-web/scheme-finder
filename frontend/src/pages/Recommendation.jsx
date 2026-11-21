import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Sparkles, ListChecks, ArrowRight, MessageCircleQuestion, Check, Scale } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { http } from "@/lib/api";
import { loc, pickItems } from "@/i18n";
import useExplanations from "@/lib/useExplanations";
import { OPTIONS } from "@/lib/questions";
import { JurisdictionBadge, StatusBadge } from "@/components/Badges";
import { ReasonList } from "@/components/Reasons";
import { ReadAloud } from "@/components/Speech";
import { PageWrap, Disclaimer } from "@/components/Flow";
import { Loading, ErrorState } from "@/components/States";
import { ApplyButtons } from "@/pages/SchemeDetail";

function NextSteps({ scheme }) {
  const { lang } = useApp();
  const ex = useExplanations([scheme.id], lang);
  return pickItems(scheme, ex[scheme.id], lang, "steps").map((s, n) => (
    <li key={n} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0B0B0C] text-xs font-semibold text-[#C6F432]">{n + 1}</span>{s}</li>
  ));
}

function Checklist({ scheme }) {
  const { t, lang } = useApp();
  const ex = useExplanations([scheme.id], lang);
  const docs = pickItems(scheme, ex[scheme.id], lang, "documents");
  const key = `ss_docs_${scheme.id}`;
  const [done, setDone] = useState(() => JSON.parse(sessionStorage.getItem(key) || "[]"));
  const toggle = (i) => { const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i]; setDone(next); sessionStorage.setItem(key, JSON.stringify(next)); };
  return (
    <section className="surface p-6 sm:p-8" data-testid="document-checklist-container" aria-label={t("a11y.checklist")}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><ListChecks className="h-5 w-5" aria-hidden />{t("rec.checklist")}</h2>
        <span data-testid="checklist-progress" className="rounded-full bg-[#0B0B0C] px-3 py-1 text-sm font-semibold text-[#C6F432]">{t("rec.ready", { n: done.length, total: docs.length })}</span>
      </div>
      <p className="mb-5 text-sm text-[#52525B]">{t("rec.checklistNote")}</p>
      <div className="grid gap-2">
        {docs.map((d, i) => (
          <button key={i} role="checkbox" aria-checked={done.includes(i)} onClick={() => toggle(i)} data-testid={`doc-checklist-item-${i}`} className="option min-h-[52px] py-3">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${done.includes(i) ? "border-[#0B0B0C] bg-[#C6F432]" : "border-[#C4C4BD]"}`} aria-hidden>{done.includes(i) && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
            <span className={`flex-1 text-[15px] ${done.includes(i) ? "text-[#71717A] line-through" : ""}`}>{d}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Recommendation() {
  const { t, lang, flow } = useApp();
  const [params] = useSearchParams();
  const ids = (params.get("ids") || "").split(",").filter(Boolean);
  const [rec, setRec] = useState(null);
  const [best, setBest] = useState(null);
  const [error, setError] = useState(false);

  const load = async () => {
    setError(false); setRec(null);
    try {
      const { data } = await http.post("/recommend", { lang, topics: flow.topics, state: flow.mode === "central" ? null : flow.state, mode: flow.mode, answers: flow.answers, scheme_ids: ids });
      setRec(data);
      if (data.best_scheme_id) setBest((await http.get(`/schemes/${data.best_scheme_id}`)).data);
    } catch { setError(true); }
  };
  useEffect(() => { load(); }, [lang, params.get("ids")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorState onRetry={load} />;
  if (!rec || (rec.best_scheme_id && !best)) return <Loading text={t("rec.loading")} />;
  if (rec.source === "none") return (
    <PageWrap narrow>
      <div className="surface grid gap-4 p-8" data-testid="rec-no-match">
        <h1 className="font-display text-2xl font-semibold">{t("rec.noMatch")}</h1>
        <p className="text-[#52525B]">{t("results.emptyBody")}</p>
        <div className="flex flex-wrap gap-2"><Link to="/topics" className="btn-lime" data-testid="rec-broaden-btn">{t("results.editTopics")}</Link><Link to="/questions" className="btn-ghost">{t("results.changeAnswers")}</Link></div>
      </div>
    </PageWrap>
  );

  const ai = rec.source === "ai";
  const byId = Object.fromEntries(rec.candidates.map((c) => [c.scheme_id, c]));
  const bestMatch = byId[rec.best_scheme_id];
  const firstPending = (rec.pending_codes || []).find((c) => OPTIONS[c]);
  const speakText = [t("rec.title"), loc(best.name, lang), ai ? rec.headline : "", ...(ai ? rec.why : [])].join(". ");

  return (
    <PageWrap>
      {ids.length > 1 && <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#52525B]"><Scale className="h-4 w-4" aria-hidden />{t("rec.fromCompare")}</p>}
      <section data-testid="ai-recommendation-card" className="relative overflow-hidden rounded-[2rem] bg-[#0B0B0C] p-6 text-white sm:p-10">
        <div className="glow-lime pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full" aria-hidden />
        <p data-testid="rec-source-badge" className="eyebrow relative inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-[#C6F432]"><Sparkles className="h-3.5 w-3.5" aria-hidden />{ai ? t("rec.aiBadge") : t("rec.rulesBadge")}</p>
        <h1 className="relative mt-5 font-display text-lg font-medium text-white/70">{t("rec.title")}</h1>
        <p data-testid="rec-best-name" className="relative mt-1 font-display text-3xl font-semibold leading-tight sm:text-4xl">{loc(best.name, lang)}</p>
        <div className="relative mt-3 flex flex-wrap gap-2"><JurisdictionBadge scheme={best} dark /><StatusBadge scheme={best} dark /></div>
        <p data-testid="rec-headline" className="relative mt-5 max-w-3xl text-base text-white/85 sm:text-lg">{ai ? rec.headline : `${t("rec.maySuit")}: ${loc(best.summary, lang)}`}</p>
        {!ai && <p className="relative mt-3 text-sm text-white/60" data-testid="rec-ai-off-note">{t("rec.aiOff")}</p>}
        <div className="relative mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="mb-3 font-display text-lg font-semibold">{t("rec.why")}</h2>
            {ai ? <ul className="grid gap-2 text-sm text-white/85" data-testid="rec-why-list">{rec.why.map((w, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C6F432]" aria-hidden />{w}</li>)}</ul>
              : <ReasonList met={rec.why_codes} topicHits={rec.topic_hits} pending={[]} dark />}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="mb-3 font-display text-lg font-semibold">{t("rec.stillCheck")}</h2>
            {ai && <ul className="mb-3 grid gap-2 text-sm text-white/85" data-testid="rec-check-list">{rec.still_to_check.map((w, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />{w}</li>)}</ul>}
            <ReasonList met={[]} pending={rec.pending_codes || bestMatch?.pending || []} dark />
            <p className="mt-3 text-sm text-white/70" data-testid="rec-official-note">{best.source_status !== "verified" ? t("detail.unverifiedWarn") : `${t("common.checkOfficial")}.`}</p>
          </div>
        </div>
        {ai && rec.follow_up_question && (
          <div className="relative mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.06] p-4" data-testid="rec-follow-up">
            <MessageCircleQuestion className="h-5 w-5 text-[#C6F432]" aria-hidden />
            <p className="flex-1 text-sm"><span className="font-semibold">{t("rec.followUp")}: </span>{rec.follow_up_question}</p>
            {firstPending && <Link to={`/questions?q=${firstPending}&return=${encodeURIComponent("/recommendation" + (ids.length ? `?ids=${ids.join(",")}` : ""))}`} className="btn-lime min-h-[40px] text-sm" data-testid="rec-answer-now-btn">{t("rec.answerNow")}</Link>}
          </div>
        )}
        {ai && rec.comparison_note && <p className="relative mt-6 text-sm text-white/70" data-testid="rec-comparison-note"><span className="font-semibold text-white">{t("rec.comparisonNote")}: </span>{rec.comparison_note}</p>}
        <div className="relative mt-8 flex flex-wrap gap-2">
          <ApplyButtons scheme={best} dark />
          <Link to={`/scheme/${best.id}`} className="btn-ghost-dark" data-testid="rec-view-scheme-btn">{t("rec.viewScheme")}</Link>
          <ReadAloud text={speakText} dark testId="rec-read-aloud-btn" />
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Checklist scheme={best} />
        <section className="surface p-6 sm:p-8" data-testid="rec-alternatives">
          <h2 className="mb-4 font-display text-xl font-semibold">{t("rec.alternatives")}</h2>
          <ul className="grid gap-3">
            {rec.alternatives.filter((a) => byId[a.scheme_id]).map((a) => {
              const s = byId[a.scheme_id].scheme;
              return (
                <li key={a.scheme_id}>
                  <Link to={`/scheme/${s.id}`} data-testid={`rec-alt-${s.id}`} className="card-hover flex items-start gap-3 rounded-2xl border border-[#E4E4E0] p-4">
                    <span className="flex-1"><span className="block font-semibold">{loc(s.name, lang)}</span><span className="mt-1 block text-sm text-[#52525B]">{a.reason || loc(s.summary, lang)}</span></span>
                    <ArrowRight className="mt-1 h-4 w-4" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          <h2 className="mb-3 mt-8 font-display text-xl font-semibold">{t("rec.nextSteps")}</h2>
          <ol className="grid gap-3 text-[15px] text-[#3f3f46]"><NextSteps scheme={best} /></ol>
        </section>
      </div>
      <Disclaimer className="mt-6" />
    </PageWrap>
  );
}
