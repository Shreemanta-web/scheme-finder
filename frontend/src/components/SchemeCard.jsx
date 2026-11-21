import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, Check, ArrowUpRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { loc } from "@/i18n";
import { JurisdictionBadge, StatusBadge, LevelBadge } from "@/components/Badges";
import { ReasonList } from "@/components/Reasons";

export function SaveButton({ id, dark, withLabel }) {
  const { t, saved, savedLoading, toggleSave } = useApp();
  const on = saved.includes(id);
  return (
    <button onClick={() => toggleSave(id)} disabled={savedLoading} aria-busy={savedLoading} aria-pressed={on} data-testid={`save-btn-${id}`} aria-label={on ? t("common.unsave") : t("common.save")}
      className={`press inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full border px-3 text-sm font-medium disabled:opacity-50 ${dark ? "border-white/20 text-white hover:bg-white/10" : "border-[#DADAD4] bg-white hover:border-[#0B0B0C]"} ${on ? (dark ? "!border-[#C6F432] text-[#C6F432]" : "!border-[#0B0B0C] bg-[#F7FDE4]") : ""}`}>
      {on ? <BookmarkCheck className="h-4 w-4" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />}
      {withLabel && (on ? t("common.saved") : t("common.save"))}
    </button>
  );
}

export default function SchemeCard({ result, compared, onCompare }) {
  const { t, lang } = useApp();
  const s = result.scheme;
  return (
    <article data-testid={`scheme-card-${s.id}`} className="surface card-hover flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <LevelBadge level={result.level} />
        <JurisdictionBadge scheme={s} />
        <StatusBadge scheme={s} />
        <span className="rounded-full bg-[#F1F1EC] px-2.5 py-1 text-xs font-medium text-[#3f3f46]">{t(`results.types.${s.benefit_type}`)}</span>
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold leading-snug">
          <Link to={`/scheme/${s.id}`} className="hover:underline hover:underline-offset-4" data-testid={`scheme-title-link-${s.id}`}>{loc(s.name, lang)}</Link>
        </h2>
        {s.official_name && s.official_name !== s.name?.en && <p className="mt-0.5 text-sm text-[#71717A]">{s.official_name}</p>}
        <p className="mt-3 text-[15px] text-[#3f3f46]">{loc(s.summary, lang)}</p>
      </div>
      <div className="rounded-2xl bg-[#F6F6F2] p-4">
        <p className="eyebrow mb-2 text-[#52525B]">{t("results.whyAppeared")}</p>
        <ReasonList met={result.met} pending={result.pending} topicHits={result.topic_hits} limit={3} showAnswerLinks={false} />
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Link to={`/scheme/${s.id}`} data-testid={`scheme-details-btn-${s.id}`} className="btn-ink min-h-[44px] flex-1 whitespace-nowrap px-5 sm:flex-none">{t("results.viewDetails")}<ArrowUpRight className="h-4 w-4" aria-hidden /></Link>
        {onCompare && (
          <button role="checkbox" aria-checked={compared} onClick={() => onCompare(s.id)} data-testid={`scheme-compare-check-${s.id}`}
            className={`press inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium ${compared ? "border-[#0B0B0C] bg-[#C6F432]" : "border-[#DADAD4] bg-white hover:border-[#0B0B0C]"}`}>
            <span className={`grid h-5 w-5 place-items-center rounded-md border-2 ${compared ? "border-[#0B0B0C] bg-[#0B0B0C] text-[#C6F432]" : "border-[#C4C4BD]"}`} aria-hidden>{compared && <Check className="h-3 w-3" strokeWidth={3} />}</span>
            {t("results.compare")}
          </button>
        )}
        <SaveButton id={s.id} />
      </div>
    </article>
  );
}
