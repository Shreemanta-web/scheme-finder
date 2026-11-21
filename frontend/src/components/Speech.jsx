import { useEffect, useRef, useState } from "react";
import { Volume2, Square, Mic } from "lucide-react";
import { useApp } from "@/context/AppContext";

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;
const Recognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export function ReadAloud({ text, testId = "read-aloud-btn", dark }) {
  const { t, speechLang } = useApp();
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => canSpeak() && window.speechSynthesis.cancel(), []);
  if (!canSpeak() || !text) return null;
  const toggle = () => {
    window.speechSynthesis.cancel();
    if (speaking) return setSpeaking(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = speechLang; u.rate = 0.95;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang === speechLang);
    if (voice) u.voice = voice;
    u.onend = u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u); setSpeaking(true);
  };
  return (
    <button type="button" onClick={toggle} data-testid={testId} aria-pressed={speaking}
      className={`press inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 text-sm font-medium ${dark ? "border-white/20 text-white hover:bg-white/10" : "border-[#DADAD4] bg-white hover:border-[#0B0B0C]"}`}>
      {speaking ? <Square className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
      {speaking ? t("common.stopReading") : t("common.readAloud")}
    </button>
  );
}

export function VoiceInput({ onResult }) {
  const { t, speechLang } = useApp();
  const [listening, setListening] = useState(false);
  const rec = useRef(null);
  if (!Recognition) return null;
  const start = () => {
    if (listening) { rec.current?.stop(); return; }
    const r = new Recognition();
    r.lang = speechLang; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e) => onResult(e.results[0][0].transcript.replace(/[.।]$/, ""));
    r.onend = r.onerror = () => setListening(false);
    rec.current = r; r.start(); setListening(true);
  };
  return (
    <button type="button" onClick={start} data-testid="voice-input-btn" aria-pressed={listening} aria-label={t("common.voiceInput")}
      className={`press grid h-11 w-11 shrink-0 place-items-center rounded-full border ${listening ? "border-[#0B0B0C] bg-[#C6F432]" : "border-[#DADAD4] bg-white hover:border-[#0B0B0C]"}`}>
      <Mic className="h-4 w-4" aria-hidden />
      <span className="sr-only">{listening ? t("common.listening") : t("common.voiceInput")}</span>
    </button>
  );
}
