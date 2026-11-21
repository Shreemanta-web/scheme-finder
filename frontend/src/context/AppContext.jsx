import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/react";
import { toast } from "sonner";
import { translate, LANGS } from "@/i18n";
import { http, withAuth } from "@/lib/api";

const Ctx = createContext(null);
const EMPTY_FLOW = { topics: [], state: null, mode: "both", answers: {}, results: null, excluded: [], compare: [] };
const read = (store, key, fallback) => { try { return JSON.parse(store.getItem(key)) ?? fallback; } catch { return fallback; } };

export function AppProvider({ children }) {
  const { isSignedIn, getToken } = useAuth();
  const [lang, setLangState] = useState(() => read(localStorage, "ss_lang", null) || "en");
  const [langChosen, setLangChosen] = useState(() => !!read(localStorage, "ss_lang", null));
  const [flow, setFlowState] = useState(() => ({ ...EMPTY_FLOW, ...read(sessionStorage, "ss_flow", {}) }));
  const [localSaved, setLocalSaved] = useState(() => read(localStorage, "ss_saved", []));
  const [accountSaved, setAccountSaved] = useState(null);
  const [me, setMe] = useState(null);

  const setLang = useCallback((code) => {
    setLangState(code); setLangChosen(true); localStorage.setItem("ss_lang", JSON.stringify(code));
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
  }, [lang]);

  const setFlow = useCallback((patch) => setFlowState((f) => {
    const next = { ...f, ...(typeof patch === "function" ? patch(f) : patch) };
    sessionStorage.setItem("ss_flow", JSON.stringify(next));
    return next;
  }), []);
  const resetFlow = useCallback(() => { sessionStorage.removeItem("ss_flow"); setFlowState(EMPTY_FLOW); }, []);

  useEffect(() => {
    if (!isSignedIn) { setMe(null); setAccountSaved(null); return; }
    (async () => {
      try {
        const cfg = await withAuth(getToken);
        const [meRes, savedRes] = await Promise.all([
          http.get("/me", cfg),
          http.post("/me/saved/merge", { ids: read(localStorage, "ss_saved", []) }, cfg),
        ]);
        setMe(meRes.data); setAccountSaved(savedRes.data.ids);
        localStorage.removeItem("ss_saved"); setLocalSaved([]);
      } catch { setAccountSaved([]); }
    })();
  }, [isSignedIn, getToken]);

  const savedLoading = !!isSignedIn && accountSaved === null;
  const saved = useMemo(() => (isSignedIn ? accountSaved || [] : localSaved), [isSignedIn, accountSaved, localSaved]);
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  const toggleSave = useCallback(async (id) => {
    if (savedLoading) return;
    const has = saved.includes(id);
    if (isSignedIn) {
      try {
        const cfg = await withAuth(getToken);
        if (has) await http.delete(`/me/saved/${id}`, cfg); else await http.post(`/me/saved/${id}`, {}, cfg);
        setAccountSaved((s) => (has ? s.filter((x) => x !== id) : [...(s || []), id]));
        toast.success(translate(lang, has ? "detail.removed" : "detail.savedAccount"));
      } catch { toast.error(translate(lang, "common.error")); }
    } else {
      const next = has ? localSaved.filter((x) => x !== id) : [...localSaved, id];
      setLocalSaved(next); localStorage.setItem("ss_saved", JSON.stringify(next));
      toast.success(translate(lang, has ? "detail.removed" : "detail.savedDevice"));
    }
  }, [saved, savedLoading, isSignedIn, getToken, localSaved, lang]);

  const clearSaved = useCallback(async () => {
    if (isSignedIn) { await http.delete("/me/saved", await withAuth(getToken)); setAccountSaved([]); }
    else { setLocalSaved([]); localStorage.removeItem("ss_saved"); }
  }, [isSignedIn, getToken]);

  const value = useMemo(() => ({
    lang, setLang, langChosen, t, flow, setFlow, resetFlow, saved, savedLoading, toggleSave, clearSaved, me, isSignedIn,
    speechLang: LANGS.find((l) => l.code === lang)?.speech,
  }), [lang, setLang, langChosen, t, flow, setFlow, resetFlow, saved, savedLoading, toggleSave, clearSaved, me, isSignedIn]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
