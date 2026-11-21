import { useEffect, useState } from "react";
import { http } from "@/lib/api";

// Fetches (cached server-side) AI plain-language versions of scheme records for hi/bn.
export default function useExplanations(ids, lang) {
  const [map, setMap] = useState({});
  const key = ids.join(",");
  useEffect(() => {
    setMap({});
    if (lang === "en" || !ids.length) return;
    let cancelled = false;
    ids.forEach((id) => http.get(`/schemes/${id}/explain`, { params: { lang } })
      .then((r) => !cancelled && r.data.available && setMap((m) => ({ ...m, [id]: r.data.explanation })))
      .catch(() => {}));
    return () => { cancelled = true; };
  }, [key, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  return map;
}
