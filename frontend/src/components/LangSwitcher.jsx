import { LANGS } from "@/i18n";
import { useApp } from "@/context/AppContext";

export default function LangSwitcher() {
  const { lang, setLang, t } = useApp();
  return (
    <div role="radiogroup" aria-label={t("a11y.langSwitcher")} className="flex items-center rounded-full border border-white/15 bg-white/5 p-1">
      {LANGS.map((l) => (
        <button key={l.code} role="radio" aria-checked={lang === l.code} lang={l.code} onClick={() => setLang(l.code)}
          data-testid={`lang-switch-${l.code}`} title={l.label}
          className={`press min-h-[34px] min-w-[38px] rounded-full px-2.5 text-sm font-semibold ${lang === l.code ? "bg-[#C6F432] text-[#0B0B0C]" : "text-white/70 hover:text-white"}`}>
          <span className="sm:hidden">{l.short}</span><span className="hidden sm:inline">{l.label}</span>
        </button>
      ))}
    </div>
  );
}
