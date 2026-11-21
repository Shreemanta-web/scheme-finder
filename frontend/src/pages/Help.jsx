import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useApp } from "@/context/AppContext";
import { PageWrap, PageTitle } from "@/components/Flow";

export default function Help() {
  const { t } = useApp();
  return (
    <PageWrap narrow>
      <PageTitle title={t("help.title")} subtitle={t("help.subtitle")} />
      <Accordion type="single" collapsible className="surface px-5 sm:px-6" data-testid="faq-accordion">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <AccordionItem key={n} value={`q${n}`} className="last:border-b-0">
            <AccordionTrigger data-testid={`faq-q${n}`} className="min-h-[56px] text-left text-base font-semibold hover:no-underline">{t(`help.q${n}`)}</AccordionTrigger>
            <AccordionContent className="text-[15px] leading-relaxed text-[#3f3f46]">{t(`help.a${n}`)}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <p className="mt-6 text-sm text-[#52525B]">{t("help.contact")}</p>
      <p className="mt-2 text-sm text-[#52525B]">{t("common.catalogueNote")}</p>
    </PageWrap>
  );
}
