import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Languages, Landmark, UserRoundX } from "lucide-react";
import { useApp } from "@/context/AppContext";
import TopicIcon from "@/components/TopicIcon";

const HERO_IMG = "https://images.pexels.com/photos/29039800/pexels-photo-29039800.jpeg?auto=compress&cs=tinysrgb&w=900";
const fade = (i) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: 0.06 * i } });

export default function Welcome() {
  const { t, setFlow } = useApp();
  const navigate = useNavigate();
  const browseAll = () => { setFlow({ topics: ["all"] }); navigate("/language"); };
  const trust = [[UserRoundX, t("welcome.trust1")], [Landmark, t("welcome.trust2")], [Languages, t("welcome.trust3")]];
  return (
    <>
      <section className="relative overflow-hidden bg-[#0B0B0C] text-white">
        <div className="grain pointer-events-none absolute inset-0" aria-hidden />
        <div className="glow-lime pointer-events-none absolute -right-40 top-10 h-80 w-80 rounded-full" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pb-28 lg:pt-24">
          <div>
            <motion.p {...fade(0)} className="eyebrow mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-[#C6F432]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C6F432]" aria-hidden />{t("welcome.eyebrow")}
            </motion.p>
            <motion.h1 {...fade(1)} data-testid="welcome-title" className="font-display text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl">{t("welcome.title")}</motion.h1>
            <motion.p {...fade(2)} className="mt-6 max-w-xl text-base text-white/70 md:text-lg">{t("welcome.subtitle")}</motion.p>
            <motion.div {...fade(3)} className="mt-10 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => navigate("/language")} data-testid="welcome-find-schemes-btn" className="btn-lime h-14 px-8 text-lg">
                {t("welcome.cta")}<ArrowRight className="h-5 w-5" aria-hidden />
              </button>
              <button onClick={browseAll} data-testid="welcome-browse-all-btn" className="btn-ghost-dark h-14">{t("welcome.browse")}</button>
            </motion.div>
            <motion.ul {...fade(4)} className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/70">
              {trust.map(([Icon, label]) => <li key={label} className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#C6F432]" aria-hidden />{label}</li>)}
            </motion.ul>
          </div>
          <motion.div {...fade(3)} className="relative hidden lg:block">
            <img src={HERO_IMG} alt="" loading="eager" width="900" height="600" className="h-[440px] w-full rounded-[2rem] object-cover opacity-90" />
            <div className="absolute -bottom-6 -left-6 w-64 rounded-2xl border border-white/10 bg-[#121214]/95 p-4 backdrop-blur">
              <div className="flex flex-wrap gap-2">
                {["study", "farming", "health", "housing", "business", "family"].map((tp) => (
                  <span key={tp} className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-[#C6F432]"><TopicIcon topic={tp} className="h-4 w-4" /></span>
                ))}
              </div>
              <p className="mt-3 text-sm text-white/70">{t("welcome.privacyLine")}</p>
            </div>
          </motion.div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t("welcome.howTitle")}</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="surface p-6">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0B0B0C] font-display text-sm font-semibold text-[#C6F432]">{n}</span>
              <p className="mt-5 font-medium">{t(`welcome.how${n}`)}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 flex items-start gap-2 text-sm text-[#52525B]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{t("welcome.privacyLine")} <Link to="/privacy" className="underline underline-offset-4" data-testid="welcome-privacy-link">{t("common.privacy")}</Link></p>
      </section>
    </>
  );
}
