import en from "./en";
import hi from "./hi";
import bn from "./bn";

export const DICTS = { en, hi, bn };
export const LANGS = [
  { code: "en", label: "English", short: "EN", speech: "en-IN", greet: "Hello" },
  { code: "hi", label: "हिन्दी", short: "हि", speech: "hi-IN", greet: "नमस्ते" },
  { code: "bn", label: "বাংলা", short: "বা", speech: "bn-IN", greet: "নমস্কার" },
];
export const LANG_NAME = { en: { en: "English", hi: "अंग्रेज़ी", bn: "ইংরেজি" }, hi: { en: "Hindi", hi: "हिन्दी", bn: "হিন্দি" }, bn: { en: "Bengali", hi: "बांग्ला", bn: "বাংলা" } };

const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

export function translate(lang, key, vars) {
  let s = get(DICTS[lang], key);
  if (s === undefined) s = get(DICTS.en, key);
  if (typeof s !== "string") return s ?? key;
  if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.replaceAll(`{${k}}`, v); });
  return s;
}

export const loc = (obj, lang) => (obj && (obj[lang] || obj.en)) || "";
export const locList = (obj, lang) => (obj && (obj[lang]?.length ? obj[lang] : obj.en)) || [];
export const isFallback = (obj, lang) => lang !== "en" && !!obj && !obj[lang]?.length;
