import { useState } from "react";
import { useAuth } from "@clerk/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/context/AppContext";
import { http, withAuth, errorText } from "@/lib/api";
import { LANGS } from "@/i18n";
import { ALL_REGIONS } from "@/lib/states";
import { OPTIONS, RULE_KEYS, TOPICS, BENEFIT_TYPES } from "@/lib/questions";

const TEXT = ["name", "department", "summary", "description", "benefits"];
const LISTS = ["eligibility", "exclusions", "documents", "steps"];
const LONG = new Set(["summary", "description", "benefits"]);
const FIELD_LABEL = { name: "name", department: "department", summary: "summary", description: "description", benefits: "benefits", eligibility: "eligibility", exclusions: "exclusions", documents: "documents", steps: "steps" };
const inputCls = "w-full rounded-xl border border-[#DADAD4] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[#0B0B0C]";

const blank = () => ({
  official_name: "", jurisdiction: "central", states: [], topics: [], benefit_type: "cash", application_mode: "online",
  official_url: "https://", application_url: "", application_window: "", source_status: "unverified", last_checked: "", is_demo: false,
  criteria: { age_min: "", age_max: "", income_max: "", list_based: false, rules: {} },
  ...Object.fromEntries([...TEXT, ...LISTS].map((f) => [f, { en: "", hi: "", bn: "" }])),
});

export function toForm(s) {
  if (!s) return blank();
  const c = s.criteria || {};
  return {
    ...blank(), ...s, last_checked: s.last_checked || "",
    criteria: { age_min: c.age_min ?? "", age_max: c.age_max ?? "", income_max: c.income_max ?? "", list_based: !!c.list_based, rules: c.rules || {} },
    ...Object.fromEntries(TEXT.map((f) => [f, { en: "", hi: "", bn: "", ...(s[f] || {}) }])),
    ...Object.fromEntries(LISTS.map((f) => [f, Object.fromEntries(["en", "hi", "bn"].map((l) => [l, (s[f]?.[l] || []).join("\n")]))])),
  };
}

function toPayload(f) {
  const num = (v) => (v === "" || v === null ? null : Number(v));
  return {
    name: f.name, official_name: f.official_name, department: f.department, jurisdiction: f.jurisdiction, states: f.jurisdiction === "state" ? f.states : [],
    topics: f.topics, benefit_type: f.benefit_type, summary: f.summary, description: f.description, benefits: f.benefits,
    ...Object.fromEntries(LISTS.map((k) => [k, Object.fromEntries(["en", "hi", "bn"].map((l) => [l, f[k][l].split("\n").map((x) => x.trim()).filter(Boolean)]))])),
    application_mode: f.application_mode, application_url: f.application_url, official_url: f.official_url, application_window: f.application_window,
    source_status: f.source_status, last_checked: f.last_checked || null, is_demo: f.is_demo,
    criteria: { age_min: num(f.criteria.age_min), age_max: num(f.criteria.age_max), income_max: num(f.criteria.income_max), list_based: f.criteria.list_based, rules: f.criteria.rules },
  };
}

const Field = ({ label, children }) => <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label>;
const Toggle = ({ on, onClick, children, testId }) => <button type="button" aria-pressed={on} onClick={onClick} data-testid={testId} className="chip min-h-[36px] text-xs">{children}</button>;

export default function AdminSchemeForm({ open, scheme, onClose, onSaved }) {
  const { t } = useApp();
  const { getToken } = useAuth();
  const [f, setF] = useState(() => toForm(scheme));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const setLoc = (field, lang, v) => setF((x) => ({ ...x, [field]: { ...x[field], [lang]: v } }));
  const setCrit = (patch) => setF((x) => ({ ...x, criteria: { ...x.criteria, ...patch } }));
  const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const toggleRule = (key, v) => setCrit({ rules: { ...f.criteria.rules, [key]: toggleIn(f.criteria.rules[key] || [], v) } });

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const cfg = await withAuth(getToken);
      const { data } = scheme ? await http.put(`/admin/schemes/${scheme.id}`, toPayload(f), cfg) : await http.post("/admin/schemes", toPayload(f), cfg);
      toast.success(t("admin.savedToast")); onSaved(data);
    } catch (ex) { setErr(errorText(ex, t("common.error"))); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto bg-white" data-testid="admin-scheme-form">
        <DialogHeader><DialogTitle className="font-display text-2xl">{scheme ? t("admin.editScheme") : t("admin.newScheme")}</DialogTitle><DialogDescription>{t("common.catalogueNote")}</DialogDescription></DialogHeader>
        <form onSubmit={save} className="grid gap-6">
          <Tabs defaultValue="en">
            <TabsList className="w-full">{LANGS.map((l) => <TabsTrigger key={l.code} value={l.code} className="flex-1" data-testid={`admin-form-lang-${l.code}`}>{l.label}</TabsTrigger>)}</TabsList>
            {LANGS.map((l) => (
              <TabsContent key={l.code} value={l.code} className="grid gap-4 pt-3" lang={l.code}>
                <p className="text-xs text-[#71717A]">{t("admin.contentFor", { lang: l.label })}{l.code === "en" ? " *" : ""}</p>
                {TEXT.map((k) => (
                  <Field key={k} label={t(`admin.f.${FIELD_LABEL[k]}`)}>
                    {LONG.has(k) ? <textarea rows={3} className={inputCls} value={f[k][l.code]} onChange={(e) => setLoc(k, l.code, e.target.value)} data-testid={`admin-field-${k}-${l.code}`} />
                      : <input className={inputCls} value={f[k][l.code]} onChange={(e) => setLoc(k, l.code, e.target.value)} data-testid={`admin-field-${k}-${l.code}`} />}
                  </Field>
                ))}
                {LISTS.map((k) => (
                  <Field key={k} label={<span>{t(`admin.f.${k}`)} <span className="font-normal text-[#71717A]">· {t("admin.linesHint")}</span></span>}>
                    <textarea rows={3} className={inputCls} value={f[k][l.code]} onChange={(e) => setLoc(k, l.code, e.target.value)} data-testid={`admin-field-${k}-${l.code}`} />
                  </Field>
                ))}
              </TabsContent>
            ))}
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("admin.f.officialName")}><input className={inputCls} value={f.official_name} onChange={(e) => set({ official_name: e.target.value })} data-testid="admin-field-official-name" /></Field>
            <Field label={t("admin.f.jurisdiction")}><select className={inputCls} value={f.jurisdiction} onChange={(e) => set({ jurisdiction: e.target.value })} data-testid="admin-field-jurisdiction"><option value="central">{t("common.central")}</option><option value="state">{t("common.stateScheme")}</option></select></Field>
            <Field label={t("admin.f.benefitType")}><select className={inputCls} value={f.benefit_type} onChange={(e) => set({ benefit_type: e.target.value })} data-testid="admin-field-benefit-type">{BENEFIT_TYPES.map((b) => <option key={b} value={b}>{t(`results.types.${b}`)}</option>)}</select></Field>
            <Field label={t("admin.f.mode")}><select className={inputCls} value={f.application_mode} onChange={(e) => set({ application_mode: e.target.value })} data-testid="admin-field-mode">{["online", "offline", "both"].map((m) => <option key={m} value={m}>{t(`compare.${m}`)}</option>)}</select></Field>
            <Field label={t("admin.f.officialUrl")}><input className={inputCls} value={f.official_url} onChange={(e) => set({ official_url: e.target.value })} data-testid="admin-field-official-url" /></Field>
            <Field label={t("admin.f.appUrl")}><input className={inputCls} value={f.application_url} onChange={(e) => set({ application_url: e.target.value })} data-testid="admin-field-app-url" /></Field>
            <Field label={t("admin.f.window")}><input className={inputCls} value={f.application_window} onChange={(e) => set({ application_window: e.target.value })} data-testid="admin-field-window" /></Field>
            <Field label={t("admin.f.status")}><select className={inputCls} value={f.source_status} onChange={(e) => set({ source_status: e.target.value })} data-testid="admin-field-status"><option value="unverified">{t("common.unverified")}</option><option value="needs_review">{t("common.needsReview")}</option><option value="verified">{t("common.verified")}</option></select></Field>
            <Field label={t("admin.f.lastChecked")}><input type="date" className={inputCls} value={f.last_checked} onChange={(e) => set({ last_checked: e.target.value })} data-testid="admin-field-last-checked" /></Field>
            <label className="flex items-center gap-3 self-end text-sm font-medium"><input type="checkbox" className="h-5 w-5 accent-[#0B0B0C]" checked={f.is_demo} onChange={(e) => set({ is_demo: e.target.checked })} data-testid="admin-field-demo" />{t("admin.f.demo")}</label>
          </div>

          <div className="grid gap-2"><p className="text-sm font-medium">{t("admin.f.topics")}</p><div className="flex flex-wrap gap-2">{TOPICS.map((tp) => <Toggle key={tp} on={f.topics.includes(tp)} onClick={() => set({ topics: toggleIn(f.topics, tp) })} testId={`admin-topic-${tp}`}>{t(`topics.${tp}`)}</Toggle>)}</div></div>
          {f.jurisdiction === "state" && <div className="grid gap-2"><p className="text-sm font-medium">{t("admin.f.states")}</p><div className="flex flex-wrap gap-1.5">{ALL_REGIONS.map((r) => <Toggle key={r.code} on={f.states.includes(r.code)} onClick={() => set({ states: toggleIn(f.states, r.code) })} testId={`admin-state-${r.code}`}>{r.name.en}</Toggle>)}</div></div>}

          <fieldset className="grid gap-4 rounded-2xl border border-[#E4E4E0] p-4">
            <legend className="px-1 font-display font-semibold">{t("admin.f.criteria")}</legend>
            <p className="text-xs text-[#71717A]">{t("admin.f.criteriaHint")}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("admin.f.ageMin")}><input type="number" min="0" className={inputCls} value={f.criteria.age_min} onChange={(e) => setCrit({ age_min: e.target.value })} data-testid="admin-crit-age-min" /></Field>
              <Field label={t("admin.f.ageMax")}><input type="number" min="0" className={inputCls} value={f.criteria.age_max} onChange={(e) => setCrit({ age_max: e.target.value })} data-testid="admin-crit-age-max" /></Field>
              <Field label={t("admin.f.incomeMax")}><input type="number" min="0" className={inputCls} value={f.criteria.income_max} onChange={(e) => setCrit({ income_max: e.target.value })} data-testid="admin-crit-income-max" /></Field>
            </div>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[#0B0B0C]" checked={f.criteria.list_based} onChange={(e) => setCrit({ list_based: e.target.checked })} data-testid="admin-crit-list-based" />{t("admin.f.listBased")}</label>
            {RULE_KEYS.map((key) => (
              <div key={key} className="grid gap-1.5">
                <p className="text-sm font-medium">{t(`questions.${key}.title`)}</p>
                <div className="flex flex-wrap gap-1.5">{OPTIONS[key].map((o) => <Toggle key={o} on={(f.criteria.rules[key] || []).includes(o)} onClick={() => toggleRule(key, o)} testId={`admin-rule-${key}-${o}`}>{t(`questions.${key}.o.${o}`)}</Toggle>)}</div>
              </div>
            ))}
          </fieldset>

          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800" data-testid="admin-form-error">{err}</p>}
          <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t border-[#E4E4E0] bg-white px-6 py-3">
            <button type="button" onClick={onClose} className="btn-ghost" data-testid="admin-form-cancel">{t("common.close")}</button>
            <button type="submit" disabled={saving} className="btn-lime" data-testid="admin-form-save">{saving ? t("admin.saving") : t("admin.saveScheme")}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
