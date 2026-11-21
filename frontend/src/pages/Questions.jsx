import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Lock, ShieldQuestion } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { OPTIONS, MULTI, SENSITIVE, CAN_BE_UNSURE, UNKNOWN, questionsFor } from "@/lib/questions";
import { PageWrap, StickyActions } from "@/components/Flow";
import { ReadAloud } from "@/components/Speech";

function OptionList({ qKey, value, onChange, t }) {
  const multi = MULTI.has(qKey);
  const vals = multi ? value || [] : value;
  const isOn = (o) => (multi ? vals.includes(o) : vals === o);
  const pick = (o) => {
    if (!multi) return onChange(o);
    const clean = vals.filter((x) => !UNKNOWN.has(x));
    onChange(clean.includes(o) ? clean.filter((x) => x !== o) : [...clean, o]);
  };
  return (
    <div role={multi ? "group" : "radiogroup"} aria-label={t(`questions.${qKey}.title`)} className="grid gap-2.5">
      {OPTIONS[qKey].map((o) => (
        <button key={o} role={multi ? "checkbox" : "radio"} aria-checked={isOn(o)} onClick={() => pick(o)} data-testid={`wizard-option-${o}`} className="option">
          <span className={`grid h-6 w-6 shrink-0 place-items-center border-2 transition-colors ${multi ? "rounded-md" : "rounded-full"} ${isOn(o) ? "border-[#0B0B0C] bg-[#C6F432]" : "border-[#C4C4BD]"}`} aria-hidden>
            {isOn(o) && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
          <span className="flex-1 text-base font-medium">{t(`questions.${qKey}.o.${o}`)}</span>
        </button>
      ))}
    </div>
  );
}

export default function Questions() {
  const { t, flow, setFlow } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const jump = params.get("q");
  const keys = useMemo(() => {
    const list = questionsFor(flow.topics?.includes("all") ? [] : flow.topics);
    return jump && OPTIONS[jump] && !list.includes(jump) ? [...list, jump] : list;
  }, [flow.topics, jump]);
  const [idx, setIdx] = useState(() => Math.max(0, keys.indexOf(jump)));
  const [showWhy, setShowWhy] = useState(false);
  const [error, setError] = useState(false);
  const returnTo = params.get("return");

  useEffect(() => { setShowWhy(false); setError(false); }, [idx]);
  const key = keys[idx];
  const value = flow.answers?.[key];
  const setAnswer = (v) => { setError(false); setFlow((f) => ({ answers: { ...f.answers, [key]: v }, results: null })); };

  const advance = () => {
    if (returnTo) return navigate(returnTo);
    if (idx < keys.length - 1) setIdx(idx + 1); else navigate("/results");
  };
  const next = () => {
    const answered = MULTI.has(key) ? (value || []).length > 0 : !!value;
    return answered ? advance() : setError(true);
  };
  const special = (v) => { setFlow((f) => ({ answers: { ...f.answers, [key]: MULTI.has(key) ? [v] : v }, results: null })); advance(); };
  const back = () => (idx > 0 ? setIdx(idx - 1) : navigate("/state"));
  const pct = Math.round(((idx + 1) / keys.length) * 100);
  const hint = t(`questions.${key}.hint`);
  const hasHint = hint !== `questions.${key}.hint`;

  return (
    <PageWrap narrow>
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-[#52525B]">
          <span data-testid="wizard-progress-text">{t("questions.progress", { n: idx + 1, total: keys.length })}</span>
          <span>{t("common.step", { n: 4, total: 4 })}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#E4E4E0]" role="progressbar" aria-label={t("a11y.progress")} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-[#0B0B0C] transition-[width] duration-300" style={{ width: `${pct}%` }}>
            <div className="ml-auto h-full w-3 rounded-full bg-[#C6F432]" />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={key} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
          {SENSITIVE.has(key) && <p className="eyebrow mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#F1F1EC] px-3 py-1.5 text-[#52525B]"><Lock className="h-3.5 w-3.5" aria-hidden />{t("questions.sensitive")}</p>}
          <h1 data-testid="wizard-question-title" className="font-display text-2xl font-semibold leading-snug sm:text-3xl">{t(`questions.${key}.title`)}</h1>
          <p className="mt-2 text-sm text-[#52525B]">{MULTI.has(key) ? t("questions.chooseAll") : t("questions.forWhom")}{hasHint && ` ${hint}`}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setShowWhy((s) => !s)} aria-expanded={showWhy} data-testid="wizard-why-we-ask-hint" className="press inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#DADAD4] bg-white px-3.5 text-sm font-medium hover:border-[#0B0B0C]">
              <ShieldQuestion className="h-4 w-4" aria-hidden />{t("questions.whyAsk")}<ChevronDown className={`h-4 w-4 transition-transform ${showWhy ? "rotate-180" : ""}`} aria-hidden />
            </button>
            <ReadAloud text={`${t(`questions.${key}.title`)}. ${OPTIONS[key].map((o) => t(`questions.${key}.o.${o}`)).join(", ")}`} testId="wizard-read-aloud-btn" />
          </div>
          {showWhy && <p data-testid="wizard-why-text" className="mt-3 rounded-2xl bg-[#0B0B0C] p-4 text-sm text-white/85">{t(`questions.${key}.why`)}</p>}
          <div className="mt-6"><OptionList qKey={key} value={value} onChange={setAnswer} t={t} /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {CAN_BE_UNSURE.has(key) && <button onClick={() => special("not_sure")} data-testid="wizard-not-sure-btn" aria-pressed={value === "not_sure"} className="chip">{t("common.notSure")}</button>}
            {SENSITIVE.has(key) && <button onClick={() => special("prefer_not")} data-testid="wizard-prefer-not-btn" aria-pressed={value === "prefer_not"} className="chip">{t("common.preferNot")}</button>}
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="mt-8 flex items-start gap-2 text-xs text-[#52525B]"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{t("questions.privacyNote")}</p>

      <StickyActions>
        {error && <p role="alert" data-testid="wizard-error" className="w-full text-sm font-medium text-red-700 sm:mr-auto sm:w-auto">{t("questions.answerRequired")}</p>}
        <button onClick={back} data-testid="wizard-back-btn" className="btn-ghost">{t("common.back")}</button>
        <button onClick={() => special("skip")} data-testid="wizard-skip-btn" className="btn-ghost">{t("common.skip")}</button>
        <button onClick={() => navigate("/")} data-testid="wizard-save-exit-btn" className="btn-ghost hidden sm:inline-flex">{t("common.saveExit")}</button>
        <button onClick={next} data-testid="wizard-next-btn" className="btn-lime">{idx === keys.length - 1 && !returnTo ? t("questions.seeResults") : t("common.continue")}</button>
      </StickyActions>
    </PageWrap>
  );
}
