import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { X, Sparkles, ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { http } from "@/lib/api";
import { loc, pickText, pickItems } from "@/i18n";
import useExplanations from "@/lib/useExplanations";
import { JurisdictionBadge, StatusBadge, LevelBadge } from "@/components/Badges";
import { PageWrap, PageTitle, Disclaimer } from "@/components/Flow";
import { Loading, ErrorState } from "@/components/States";

const List = ({ items }) => <ul className="grid list-disc gap-1 pl-4">{items.map((i, n) => <li key={n}>{i}</li>)}</ul>;

export default function Compare() {
  const { t, lang, flow, setFlow } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ids = (params.get("ids") || (flow.compare || []).join(",")).split(",").filter(Boolean);
  const [schemes, setSchemes] = useState(null);
  const [error, setError] = useState(false);

  const load = () => { setError(false); http.post("/schemes/batch", { ids }).then((r) => setSchemes(r.data)).catch(() => setError(true)); };
  useEffect(load, [params.get("ids")]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (id) => {
    const next = ids.filter((x) => x !== id);
    setFlow({ compare: next });
    navigate(`/compare?ids=${next.join(",")}`, { replace: true });
  };
  const ex = useExplanations((schemes || []).map((s) => s.id), lang);
  if (error) return <ErrorState onRetry={load} />;
  if (!schemes) return <Loading />;
  const matchOf = (id) => (flow.results || []).find((r) => r.scheme_id === id);

  const rows = [
    ["jurisdiction", (s) => <JurisdictionBadge scheme={s} />],
    ["match", (s) => (matchOf(s.id) ? <LevelBadge level={matchOf(s.id).level} /> : "—")],
    ["benefits", (s) => pickText(s, ex[s.id], lang, "benefits")],
    ["eligibility", (s) => <List items={pickItems(s, ex[s.id], lang, "eligibility")} />],
    ["documents", (s) => <List items={pickItems(s, ex[s.id], lang, "documents")} />],
    ["method", (s) => t(`compare.${s.application_mode}`)],
    ["period", (s) => s.application_window || <span className="text-[#71717A]">{t("detail.periodUnknown")}</span>],
    ["status", (s) => <StatusBadge scheme={s} />],
    ["lastChecked", (s) => s.last_checked || t("common.notCheckedYet")],
  ];

  return (
    <PageWrap>
      <Link to="/results" data-testid="compare-back-btn" className="chip mb-6"><ArrowLeft className="h-4 w-4" aria-hidden />{t("compare.backToResults")}</Link>
      <PageTitle title={t("compare.title")} subtitle={t("compare.subtitle")} />
      {schemes.length < 2 ? (
        <p data-testid="compare-empty" className="surface p-6">{t("compare.empty")}</p>
      ) : (
        <>
          <div className="surface overflow-x-auto" data-testid="compare-modal-content">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <caption className="sr-only">{t("compare.title")}</caption>
              <thead>
                <tr className="bg-[#0B0B0C] text-white">
                  <th scope="col" className="w-40 p-4 align-top font-medium text-white/60"><span className="sr-only">—</span></th>
                  {schemes.map((s) => (
                    <th key={s.id} scope="col" className="min-w-[230px] p-4 align-top">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/scheme/${s.id}`} data-testid={`compare-scheme-link-${s.id}`} className="font-display text-base font-semibold hover:underline">{loc(s.name, lang)}</Link>
                        <button onClick={() => remove(s.id)} aria-label={`${t("compare.remove")} ${loc(s.name, lang)}`} data-testid={`compare-remove-${s.id}`} className="press grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/10"><X className="h-4 w-4" aria-hidden /></button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([key, render]) => (
                  <tr key={key} className="border-t border-[#E4E4E0] align-top">
                    <th scope="row" className="bg-[#FAFAF7] p-4 font-semibold">{t(`compare.${key}`)}</th>
                    {schemes.map((s) => <td key={s.id} className="p-4 text-[#3f3f46]" data-testid={`compare-cell-${key}-${s.id}`}>{render(s)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to={`/recommendation?ids=${schemes.map((s) => s.id).join(",")}`} data-testid="compare-recommend-btn" className="btn-lime"><Sparkles className="h-4 w-4" aria-hidden />{t("compare.recommend")}</Link>
          </div>
        </>
      )}
      <Disclaimer className="mt-6" />
    </PageWrap>
  );
}
