import { AlertCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function Loading({ text }) {
  const { t } = useApp();
  return (
    <div role="status" aria-live="polite" data-testid="loading-state" className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex gap-2" aria-hidden>
        {[0, 1, 2].map((i) => <span key={i} className="h-3 w-3 animate-bounce rounded-full bg-[#0B0B0C] [animation-duration:900ms]" style={{ animationDelay: `${i * 150}ms`, background: i === 1 ? "#C6F432" : undefined, outline: i === 1 ? "1px solid #0B0B0C" : undefined }} />)}
      </div>
      <p className="font-display text-xl font-medium">{text || t("common.loading")}</p>
    </div>
  );
}

export function ErrorState({ onRetry, text }) {
  const { t } = useApp();
  return (
    <div role="alert" data-testid="error-state" className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertCircle className="h-8 w-8 text-red-700" aria-hidden />
      <p className="text-lg">{text || t("common.error")}</p>
      {onRetry && <button onClick={onRetry} data-testid="error-retry-btn" className="btn-ink">{t("common.retry")}</button>}
    </div>
  );
}
