import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function StepHeader({ step, total = 4, backTo }) {
  const { t } = useApp();
  const navigate = useNavigate();
  return (
    <div className="mb-8 flex items-center gap-4">
      {backTo && (
        <button onClick={() => navigate(backTo)} data-testid="step-back-btn" aria-label={t("common.back")} className="press grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#DADAD4] bg-white hover:border-[#0B0B0C]">
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
      )}
      <div className="flex-1">
        <p className="mb-2 text-sm font-medium text-[#52525B]" data-testid="step-indicator">{t("common.step", { n: step, total })}</p>
        <div className="flex gap-1.5" role="progressbar" aria-label={t("a11y.progress")} aria-valuemin={1} aria-valuemax={total} aria-valuenow={step}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < step ? "bg-[#0B0B0C]" : "bg-[#DADAD4]"} ${i === step - 1 ? "!bg-[#C6F432] ring-1 ring-[#0B0B0C]" : ""}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StickyActions({ children }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-10 border-t border-[#E4E4E0] bg-[#F6F6F2]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-end gap-3">{children}</div>
    </div>
  );
}

export const PageWrap = ({ children, narrow, className = "" }) => (
  <div className={`mx-auto w-full ${narrow ? "max-w-2xl" : "max-w-6xl"} px-4 pb-6 pt-8 sm:px-6 sm:pt-12 ${className}`}>{children}</div>
);

export function PageTitle({ title, subtitle, eyebrow }) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="eyebrow mb-3 text-[#52525B]">{eyebrow}</p>}
      <h1 className="font-display text-3xl font-semibold leading-tight text-[#0B0B0C] sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-3 max-w-2xl text-base text-[#52525B]">{subtitle}</p>}
    </div>
  );
}

export function Disclaimer({ className = "" }) {
  const { t } = useApp();
  return <p data-testid="eligibility-disclaimer" className={`rounded-2xl border border-[#E4E4E0] bg-white px-4 py-3 text-sm text-[#3f3f46] ${className}`}>{t("common.disclaimer")}</p>;
}
