import { useApp } from "@/context/AppContext";
import { PageWrap, PageTitle } from "@/components/Flow";

export default function Privacy() {
  const { t, resetFlow } = useApp();
  return (
    <PageWrap narrow>
      <PageTitle title={t("privacyPage.title")} subtitle={t("privacyPage.subtitle")} />
      <div className="grid gap-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <section key={n} className="surface p-6" data-testid={`privacy-section-${n}`}>
            <h2 className="font-display text-lg font-semibold">{t(`privacyPage.h${n}`)}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#3f3f46]">{t(`privacyPage.p${n}`)}</p>
          </section>
        ))}
      </div>
      <button onClick={resetFlow} data-testid="privacy-clear-answers-btn" className="btn-ghost mt-6">{t("common.startOver")}</button>
    </PageWrap>
  );
}
