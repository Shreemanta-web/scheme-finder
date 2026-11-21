import { BadgeCheck, AlertTriangle, Landmark, MapPin, FlaskConical } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { regionName } from "@/lib/states";

export function JurisdictionBadge({ scheme, dark }) {
  const { t, lang } = useApp();
  const central = scheme.jurisdiction === "central";
  const label = central ? t("common.central") : (scheme.states || []).map((s) => regionName(s, lang)).join(", ") || t("common.stateScheme");
  return (
    <span data-testid="jurisdiction-badge" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${dark ? "bg-white/10 text-white" : central ? "bg-[#0B0B0C] text-white" : "bg-[#EEF0E6] text-[#3B4A0B]"}`}>
      {central ? <Landmark className="h-3.5 w-3.5" aria-hidden /> : <MapPin className="h-3.5 w-3.5" aria-hidden />}
      {central ? label : `${t("common.stateScheme")} · ${label}`}
    </span>
  );
}

export function StatusBadge({ scheme, dark }) {
  const { t } = useApp();
  if (scheme.is_demo) return <span data-testid="status-badge" className="inline-flex items-center gap-1.5 rounded-full bg-[#FDE68A] px-2.5 py-1 text-xs font-semibold text-[#5B3A00]"><FlaskConical className="h-3.5 w-3.5" aria-hidden />{t("common.demo")}</span>;
  if (scheme.source_status === "verified")
    return <span data-testid="status-badge" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${dark ? "bg-[#C6F432] text-[#0B0B0C]" : "bg-[#ECFCCB] text-[#2F4207]"}`}><BadgeCheck className="h-3.5 w-3.5" aria-hidden />{t("common.verified")}</span>;
  return (
    <span data-testid="status-badge" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${dark ? "bg-amber-400/15 text-amber-200" : "bg-[#FEF3C7] text-[#7A4A00]"}`}>
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />{t(scheme.source_status === "needs_review" ? "common.needsReview" : "common.unverified")}
    </span>
  );
}

export function LevelBadge({ level }) {
  const { t } = useApp();
  return (
    <span data-testid="match-level-badge" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${level === "strong" ? "bg-[#0B0B0C] text-[#C6F432]" : "bg-[#F1F1EC] text-[#3f3f46]"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${level === "strong" ? "bg-[#C6F432]" : "bg-[#71717A]"}`} aria-hidden />
      {t(level === "strong" ? "results.strong" : "results.possible")}
    </span>
  );
}
