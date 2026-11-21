import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { LANGS } from "@/i18n";
import { useApp } from "@/context/AppContext";
import { PageWrap, PageTitle, StepHeader, StickyActions } from "@/components/Flow";

export default function Language() {
  const { t, lang, setLang, flow } = useApp();
  const navigate = useNavigate();
  const next = () => navigate(flow.topics?.includes("all") ? "/state" : "/topics");
  return (
    <PageWrap narrow>
      <StepHeader step={1} backTo="/" />
      <PageTitle title={t("language.title")} subtitle={t("language.subtitle")} />
      <div role="radiogroup" aria-label={t("language.title")} className="grid gap-3">
        {LANGS.map((l) => (
          <button key={l.code} role="radio" aria-checked={lang === l.code} lang={l.code} onClick={() => setLang(l.code)}
            data-testid={`language-option-${l.code}`} className="option min-h-[84px] px-5">
            <span className="flex-1">
              <span className="block font-display text-2xl font-semibold">{l.label}</span>
              <span className="text-sm text-[#52525B]">{l.greet}</span>
            </span>
            <span className={`grid h-8 w-8 place-items-center rounded-full border-2 ${lang === l.code ? "border-[#0B0B0C] bg-[#C6F432]" : "border-[#DADAD4]"}`} aria-hidden>
              {lang === l.code && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
          </button>
        ))}
      </div>
      <StickyActions>
        <button onClick={next} data-testid="language-continue-btn" className="btn-lime w-full sm:w-auto">{t("common.continue")}</button>
      </StickyActions>
    </PageWrap>
  );
}
