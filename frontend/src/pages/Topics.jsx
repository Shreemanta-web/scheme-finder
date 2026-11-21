import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Info } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { TOPICS } from "@/lib/questions";
import TopicIcon from "@/components/TopicIcon";
import { PageWrap, PageTitle, StepHeader, StickyActions } from "@/components/Flow";

export default function Topics() {
  const { t, flow, setFlow } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const selected = flow.topics || [];

  const toggle = (topic) => {
    setError(false);
    setFlow((f) => {
      const cur = f.topics || [];
      if (topic === "all") return { topics: cur.includes("all") ? [] : ["all"], results: null };
      const base = cur.filter((x) => x !== "all");
      return { topics: base.includes(topic) ? base.filter((x) => x !== topic) : [...base, topic], results: null };
    });
  };
  const next = () => (selected.length ? navigate("/state") : setError(true));

  return (
    <PageWrap>
      <StepHeader step={2} backTo="/language" />
      <PageTitle title={t("topics.title")} subtitle={t("topics.subtitle")} />
      <div role="group" aria-label={t("topics.title")} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...TOPICS, "all"].map((topic) => {
          const on = selected.includes(topic);
          return (
            <button key={topic} aria-pressed={on} onClick={() => toggle(topic)} data-testid={`topic-card-${topic}`}
              className="option min-h-[120px] flex-col items-start gap-4 p-5 sm:min-h-[150px]">
              <span className="flex w-full items-start justify-between">
                <span className={`grid h-12 w-12 place-items-center rounded-2xl transition-colors ${on ? "bg-[#0B0B0C] text-[#C6F432]" : "bg-[#F1F1EC] text-[#0B0B0C]"}`}>
                  <TopicIcon topic={topic} className="h-6 w-6" />
                </span>
                <span className={`grid h-7 w-7 place-items-center rounded-full border-2 transition-colors ${on ? "border-[#0B0B0C] bg-[#C6F432]" : "border-[#DADAD4]"}`} aria-hidden>
                  {on && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
              </span>
              <span>
                <span className="block font-display text-lg font-semibold leading-snug">{t(`topics.${topic}`)}</span>
                <span className="mt-1 block text-sm text-[#52525B]">{t(`topics.${topic}Desc`)}</span>
              </span>
              {on && <span className="sr-only">{t("a11y.selectedOption")}</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-6 flex items-start gap-2 text-sm text-[#52525B]"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{t("topics.note")}</p>
      <StickyActions>
        {error && <p role="alert" data-testid="topics-error" className="mr-auto text-sm font-medium text-red-700">{t("topics.errorNone")}</p>}
        <span data-testid="topics-count" className="text-sm text-[#52525B]">{t("topics.count", { n: selected.length })}</span>
        <button onClick={next} data-testid="topic-continue-btn" className="btn-lime">{t("common.continue")}</button>
      </StickyActions>
    </PageWrap>
  );
}
