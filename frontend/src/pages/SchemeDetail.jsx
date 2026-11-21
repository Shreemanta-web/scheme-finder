import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink, Share2, AlertTriangle, Sparkles, CalendarClock, FileText, Building2, Languages, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { http } from "@/lib/api";
import { loc, locList, LANG_NAME } from "@/i18n";
import { JurisdictionBadge, StatusBadge, LevelBadge } from "@/components/Badges";
import { SaveButton } from "@/components/SchemeCard";
import { ReasonList } from "@/components/Reasons";
import { ReadAloud } from "@/components/Speech";
import { Disclaimer } from "@/components/Flow";
import { Loading, ErrorState } from "@/components/States";

const Section = ({ title, children, testId }) => (
  <section className="surface p-6 sm:p-8" data-testid={testId}>
    <h2 className="mb-4 font-display text-xl font-semibold">{title}</h2>
    <div className="text-[15px] leading-relaxed text-[#3f3f46]">{children}</div>
  </section>
);
const Bullets = ({ items }) => <ul className="grid gap-2">{items.map((i, n) => <li key={n} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0B0B0C]" aria-hidden />{i}</li>)}</ul>;

function useExplanation(id, lang, scheme) {
  const [state, setState] = useState({ status: "idle", data: null });
  const fetchIt = (forLang) => {
    setState({ status: "loading", data: null });
    http.get(`/schemes/${id}/explain`, { params: { lang: forLang } })
      .then((r) => setState(r.data.available ? { status: "ok", data: r.data.explanation } : { status: "unavailable", data: null }))
      .catch(() => setState({ status: "unavailable", data: null }));
  };
  useEffect(() => { if (scheme && lang !== "en") fetchIt(lang); else setState({ status: "idle", data: null }); }, [id, lang, !!scheme]); // eslint-disable-line react-hooks/exhaustive-deps
  return [state, fetchIt];
}

export function ApplyButtons({ scheme, dark }) {
  const { t } = useApp();
  return (
    <div className="flex flex-wrap gap-2">
      <a href={scheme.application_url || scheme.official_url} target="_blank" rel="noopener noreferrer" data-testid={`scheme-apply-btn-${scheme.id}`} className="btn-lime">
        {t("common.applyNow")}<ExternalLink className="h-4 w-4" aria-hidden /><span className="sr-only">{t("common.opensNewTab")}</span>
      </a>
      {scheme.application_url && scheme.application_url !== scheme.official_url && (
        <a href={scheme.official_url} target="_blank" rel="noopener noreferrer" data-testid={`scheme-official-btn-${scheme.id}`} className={dark ? "btn-ghost-dark" : "btn-ghost"}>
          {t("common.visitOfficial")}<ExternalLink className="h-4 w-4" aria-hidden /><span className="sr-only">{t("common.opensNewTab")}</span>
        </a>
      )}
    </div>
  );
}

export default function SchemeDetail() {
  const { id } = useParams();
  const { t, lang, flow } = useApp();
  const [scheme, setScheme] = useState(null);
  const [error, setError] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [exp, fetchExp] = useExplanation(id, lang, scheme);

  const load = () => { setError(null); http.get(`/schemes/${id}`).then((r) => setScheme(r.data)).catch((e) => setError(e?.response?.status === 404 ? "404" : "err")); };
  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorState text={error === "404" ? t("detail.notFound") : undefined} onRetry={error === "404" ? null : load} />;
  if (!scheme) return <Loading />;

  const e = exp.status === "ok" ? exp.data : null;
  const pick = (field) => (lang !== "en" && scheme[field]?.[lang]) || e?.[field] || scheme[field]?.en || "";
  const pickList = (field) => (lang !== "en" && scheme[field]?.[lang]?.length ? scheme[field][lang] : e?.[field]?.length ? e[field] : scheme[field]?.en || []);
  const usedAI = !!e;
  const fellBack = lang !== "en" && exp.status === "unavailable";
  const match = (flow.results || []).find((r) => r.scheme_id === id);
  const name = loc(scheme.name, lang);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else { await navigator.clipboard.writeText(url); toast.success(t("common.linkCopied")); }
    } catch (err) { if (err?.name !== "AbortError") toast.error(`${t("common.error")} ${url}`); }
  };
  const readText = [name, pick("summary"), pick("benefits"), ...pickList("eligibility")].join(". ");

  return (
    <>
      <section className="bg-[#0B0B0C] text-white">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
          <div className="flex flex-wrap gap-2">
            <JurisdictionBadge scheme={scheme} dark /><StatusBadge scheme={scheme} dark />{match && <LevelBadge level={match.level} />}
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium">{t(`results.types.${scheme.benefit_type}`)}</span>
          </div>
          <h1 data-testid="scheme-detail-title" className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-5xl">{name}</h1>
          <dl className="mt-4 grid gap-1 text-sm text-white/70">
            {scheme.official_name && <div><dt className="inline font-semibold text-white/90">{t("detail.officialName")}: </dt><dd className="inline">{scheme.official_name}</dd></div>}
            {loc(scheme.department, lang) && <div><dt className="inline font-semibold text-white/90">{t("detail.department")}: </dt><dd className="inline">{loc(scheme.department, lang)}</dd></div>}
          </dl>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <ApplyButtons scheme={scheme} dark />
            <SaveButton id={scheme.id} dark withLabel />
            <button onClick={share} data-testid="scheme-share-btn" className="btn-ghost-dark min-h-[44px]"><Share2 className="h-4 w-4" aria-hidden />{t("common.share")}</button>
            <ReadAloud text={readText} dark testId="scheme-read-aloud-btn" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-6">
          {(scheme.source_status !== "verified" || scheme.is_demo) && (
            <p role="note" data-testid="scheme-unverified-warning" className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-[#FFFBEB] p-4 text-sm text-[#5B3A00]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{scheme.is_demo ? t("detail.demoWarn") : t("detail.unverifiedWarn")}
            </p>
          )}
          {lang !== "en" && (exp.status === "loading" ? (
            <p role="status" data-testid="scheme-ai-loading" className="flex items-center gap-2 rounded-2xl bg-white p-4 text-sm"><Sparkles className="h-4 w-4 animate-pulse" aria-hidden />{t("detail.explaining")}</p>
          ) : (usedAI || fellBack) && (
            <div data-testid="scheme-ai-notice" className="rounded-2xl border border-[#E4E4E0] bg-white p-4 text-sm">
              <p className="flex items-start gap-2"><Languages className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{usedAI ? t("detail.aiTranslated", { lang: LANG_NAME[lang][lang] }) : t("detail.aiUnavailable")}</p>
              {usedAI && <button onClick={() => setShowOriginal((s) => !s)} aria-expanded={showOriginal} data-testid="scheme-show-original-btn" className="chip mt-3">{showOriginal ? t("detail.hideOriginal") : t("detail.showOriginal")}<ChevronDown className={`h-4 w-4 ${showOriginal ? "rotate-180" : ""}`} aria-hidden /></button>}
              {showOriginal && (
                <div lang="en" className="mt-3 grid gap-2 rounded-xl bg-[#F6F6F2] p-4 text-[#3f3f46]" data-testid="scheme-original-text">
                  <p className="font-semibold">{t("detail.original")}</p><p>{scheme.summary.en}</p><p>{scheme.benefits.en}</p><Bullets items={scheme.eligibility.en || []} />
                </div>
              )}
            </div>
          ))}

          <Section title={t("detail.summary")} testId="scheme-summary-section">
            <p className="text-base text-[#0B0B0C]">{pick("summary")}</p>
            {pick("description") && <p className="mt-3">{pick("description")}</p>}
            {lang === "en" && exp.status !== "ok" && (
              <button onClick={() => fetchExp("en")} disabled={exp.status === "loading"} data-testid="scheme-explain-simple-btn" className="chip mt-4"><Sparkles className="h-4 w-4" aria-hidden />{exp.status === "loading" ? t("detail.explaining") : t("detail.explainSimple")}</button>
            )}
            {lang === "en" && exp.status === "unavailable" && <p className="mt-2 text-sm text-[#71717A]">{t("detail.aiUnavailable")}</p>}
          </Section>
          <Section title={t("detail.benefits")} testId="scheme-benefits-section"><p>{pick("benefits") || t("common.notConfirmed")}</p></Section>
          <Section title={t("detail.whoQualifies")} testId="scheme-eligibility-section">
            <Bullets items={pickList("eligibility")} />
            {pickList("exclusions").length > 0 && (<><h3 className="mb-3 mt-6 font-display text-base font-semibold text-[#0B0B0C]">{t("detail.exclusions")}</h3><Bullets items={pickList("exclusions")} /></>)}
          </Section>
          <Section title={t("detail.whyMatched")} testId="scheme-why-matched-section">
            {match ? <ReasonList met={match.met} pending={[]} topicHits={match.topic_hits} /> : (
              <div className="flex flex-wrap items-center gap-3"><p>{t("detail.noMatchInfo")}</p><Link to="/topics" className="btn-ghost min-h-[40px]" data-testid="scheme-start-questions-btn">{t("detail.startQuestions")}</Link></div>
            )}
          </Section>
          <Section title={t("detail.toConfirm")} testId="scheme-to-confirm-section">
            <ReasonList met={[]} pending={match ? match.pending : []} />
            <p className={match?.pending?.length ? "mt-4" : ""}>{t("common.checkOfficial")}: {loc(scheme.department, lang) || t("common.notConfirmed")}.</p>
          </Section>
          <Section title={t("detail.documents")} testId="scheme-documents-section">
            <ul className="grid gap-2">{pickList("documents").map((d, n) => <li key={n} className="flex gap-3"><FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{d}</li>)}</ul>
            <p className="mt-4 text-sm text-[#71717A]">{t("detail.docsNote")}</p>
          </Section>
          <Section title={t("detail.steps")} testId="scheme-steps-section">
            <ol className="grid gap-4">{pickList("steps").map((s, n) => (
              <li key={n} className="flex gap-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0B0B0C] text-sm font-semibold text-[#C6F432]">{n + 1}</span><span className="pt-1">{s}</span></li>
            ))}</ol>
          </Section>
          {e?.glossary?.length > 0 && (
            <Section title={t("detail.glossary")} testId="scheme-glossary-section">
              <dl className="grid gap-3">{e.glossary.map((g) => <div key={g.term}><dt className="font-semibold text-[#0B0B0C]">{g.term}</dt><dd>{g.meaning}</dd></div>)}</dl>
            </Section>
          )}
          <Disclaimer />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="surface grid gap-5 p-6" data-testid="scheme-source-box">
            <h2 className="font-display text-lg font-semibold">{t("detail.sourceBox")}</h2>
            <dl className="grid gap-4 text-sm">
              <div><dt className="text-[#71717A]">{t("common.officialSource")}</dt><dd><a href={scheme.official_url} target="_blank" rel="noopener noreferrer" data-testid="scheme-official-source-link" className="break-all font-medium underline underline-offset-4">{scheme.official_url}</a></dd></div>
              <div><dt className="text-[#71717A]">{t("common.lastChecked")}</dt><dd data-testid="scheme-last-checked" className="font-medium">{scheme.last_checked || t("common.notCheckedYet")}</dd></div>
              <div><dt className="text-[#71717A]">{t("detail.sourceStatus")}</dt><dd className="mt-1"><StatusBadge scheme={scheme} /></dd></div>
              <div><dt className="flex items-center gap-1.5 text-[#71717A]"><CalendarClock className="h-4 w-4" aria-hidden />{t("detail.period")}</dt><dd data-testid="scheme-application-period" className="font-medium">{scheme.application_window || t("detail.periodUnknown")}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-[#71717A]"><Building2 className="h-4 w-4" aria-hidden />{t("detail.mode")}</dt><dd className="font-medium">{t(`compare.${scheme.application_mode}`)}</dd></div>
            </dl>
            <ApplyButtons scheme={scheme} />
            <Link to={`/recommendation`} data-testid="scheme-recommend-link" className="btn-ghost">{t("detail.recommend")}</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
