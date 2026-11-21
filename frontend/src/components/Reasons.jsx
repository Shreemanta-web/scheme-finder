import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, CircleHelp, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { OPTIONS } from "@/lib/questions";

export function ReasonList({ met = [], pending = [], topicHits = [], showAnswerLinks = true, limit, dark }) {
  const { t } = useApp();
  const { pathname, search } = useLocation();
  const ret = encodeURIComponent(pathname + search);
  const metItems = [...topicHits.map((tp) => ({ k: `topic-${tp}`, text: t("results.matchedTopic", { topic: t(`topics.${tp}`) }) })),
    ...met.map((c) => ({ k: c, text: t(`crit.${c}.met`) }))];
  const shownMet = limit ? metItems.slice(0, limit) : metItems;
  const shownPending = limit ? pending.slice(0, Math.max(1, limit - 1)) : pending;
  const sub = dark ? "text-white/80" : "text-[#3f3f46]";
  return (
    <div className="grid gap-4">
      {shownMet.length > 0 && (
        <ul className="grid gap-1.5" data-testid="reasons-met">
          {shownMet.map((m) => (
            <li key={m.k} className={`flex items-start gap-2 text-sm ${sub}`}>
              <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? "text-[#C6F432]" : "text-[#3F6212]"}`} aria-hidden />{m.text}
            </li>
          ))}
        </ul>
      )}
      {shownPending.length > 0 && (
        <ul className="grid gap-1.5" data-testid="reasons-pending">
          {shownPending.map((c) => (
            <li key={c} className={`flex flex-wrap items-start gap-2 text-sm ${sub}`}>
              <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
              <span className="flex-1">{t(`crit.${c}.pending`)}</span>
              {showAnswerLinks && OPTIONS[c] && (
                <Link to={`/questions?q=${c}&return=${ret}`} data-testid={`answer-pending-${c}`} className={`press inline-flex items-center gap-1 rounded-full px-2 text-xs font-semibold underline underline-offset-4 ${dark ? "text-[#C6F432]" : "text-[#0B0B0C]"}`}>
                  {t("crit.answer")}<ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              )}
            </li>
          ))}
          {limit && pending.length > shownPending.length && <li className="pl-6 text-xs text-[#71717A]">+{pending.length - shownPending.length}</li>}
        </ul>
      )}
    </div>
  );
}
