import { useEffect, useState } from "react";
import { http } from "@/lib/api";

const cache = new Map();
const fetchExplanation = (id, lang) => {
  const k = `${id}:${lang}`;
  if (!cache.has(k)) {
    const p = http.get(`/schemes/${id}/explain`, { params: { lang } }).then((r) => (r.data.available ? r.data.explanation : null)).catch(() => null);
    cache.set(k, p);
    p.then((v) => { if (!v) setTimeout(() => cache.delete(k), 60000); });
  }
  return cache.get(k);
};

// AI plain-language versions of scheme records for hi/bn; one request per id+lang shared across components.
export default function useExplanations(ids, lang) {
  const [map, setMap] = useState({});
  const key = ids.join(",");
  useEffect(() => {
    setMap({});
    if (lang === "en" || !ids.length) return;
    let cancelled = false;
    ids.forEach((id) => fetchExplanation(id, lang).then((e) => !cancelled && e && setMap((m) => ({ ...m, [id]: e }))));
    return () => { cancelled = true; };
  }, [key, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  return map;
}
