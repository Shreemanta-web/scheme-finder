import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Show, SignInButton } from "@clerk/react";
import { Bookmark } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { http } from "@/lib/api";
import { loc } from "@/i18n";
import { JurisdictionBadge, StatusBadge } from "@/components/Badges";
import { SaveButton } from "@/components/SchemeCard";
import { PageWrap, PageTitle } from "@/components/Flow";
import { Loading } from "@/components/States";

export default function Saved() {
  const { t, lang, saved, clearSaved, isSignedIn } = useApp();
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!saved.length) return setItems([]);
    http.post("/schemes/batch", { ids: saved }).then((r) => setItems(r.data)).catch(() => setItems([]));
  }, [saved.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageWrap>
      <PageTitle title={t("saved.title")} subtitle={isSignedIn ? t("saved.accountNote") : t("saved.deviceNote")} />
      <Show when="signed-out"><SignInButton><button className="btn-ink mb-6" data-testid="saved-sign-in-btn">{t("common.signIn")}</button></SignInButton></Show>
      {!items ? <Loading /> : items.length === 0 ? (
        <div className="surface flex items-center gap-3 p-8" data-testid="saved-empty"><Bookmark className="h-5 w-5" aria-hidden />{t("saved.empty")}</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2" data-testid="saved-list">
            {items.map((s) => (
              <article key={s.id} className="surface card-hover flex flex-col gap-3 p-5" data-testid={`saved-item-${s.id}`}>
                <div className="flex flex-wrap gap-2"><JurisdictionBadge scheme={s} /><StatusBadge scheme={s} /></div>
                <Link to={`/scheme/${s.id}`} className="font-display text-lg font-semibold hover:underline">{loc(s.name, lang)}</Link>
                <p className="text-sm text-[#52525B]">{loc(s.summary, lang)}</p>
                <div className="mt-auto flex gap-2"><Link to={`/scheme/${s.id}`} className="btn-ink min-h-[44px] flex-1">{t("results.viewDetails")}</Link><SaveButton id={s.id} /></div>
              </article>
            ))}
          </div>
          <button onClick={clearSaved} className="btn-ghost mt-6" data-testid="saved-clear-all-btn">{t("saved.clearAll")}</button>
        </>
      )}
    </PageWrap>
  );
}
