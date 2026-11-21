import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Show, SignInButton, useAuth } from "@clerk/react";
import { toast } from "sonner";
import { Plus, Search, ShieldAlert, ShieldCheck, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/context/AppContext";
import { http, withAuth, errorText } from "@/lib/api";
import { loc } from "@/i18n";
import { JurisdictionBadge, StatusBadge } from "@/components/Badges";
import { PageWrap, PageTitle } from "@/components/Flow";
import { Loading, ErrorState } from "@/components/States";
import AdminSchemeForm from "@/pages/AdminSchemeForm";

function Users() {
  const { t } = useApp();
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const load = async () => setData((await http.get("/users", await withAuth(getToken))).data);
  useEffect(() => { load().catch(() => setData({ users: [], roles: [] })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const change = async (uid, role) => {
    try { await http.patch(`/users/${uid}/role`, { role }, await withAuth(getToken)); toast.success(t("admin.users.roleSaved")); load(); }
    catch (e) { toast.error(errorText(e, t("common.error"))); }
  };
  if (!data) return <Loading />;
  return (
    <div className="surface overflow-x-auto" data-testid="admin-users-table">
      {data.users.length === 0 ? <p className="p-6">{t("admin.users.none")}</p> : (
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-[#E4E4E0]"><th className="p-4">{t("admin.users.email")}</th><th className="p-4">{t("admin.users.role")}</th></tr></thead>
          <tbody>{data.users.map((u) => (
            <tr key={u.user_id} className="border-b border-[#E4E4E0] last:border-0">
              <td className="p-4">{u.email || u.user_id}</td>
              <td className="p-4"><select value={u.role} onChange={(e) => change(u.user_id, e.target.value)} data-testid={`admin-user-role-${u.user_id}`} className="h-10 rounded-full border border-[#DADAD4] bg-white px-3">
                {data.roles.map((r) => <option key={r} value={r}>{t(`admin.users.roles.${r}`)}</option>)}</select></td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

function SchemesAdmin() {
  const { t, lang } = useApp();
  const { getToken } = useAuth();
  const [items, setItems] = useState(null);
  const [system, setSystem] = useState(null);
  const [q, setQ] = useState("");
  const [view, setView] = useState("active");
  const [editing, setEditing] = useState(undefined);
  const [error, setError] = useState(false);

  const load = async () => {
    try {
      const cfg = await withAuth(getToken);
      const [a, b] = await Promise.all([http.get("/admin/schemes", cfg), http.get("/admin/system", cfg)]);
      setItems(a.data); setSystem(b.data);
    } catch { setError(true); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const replace = (doc) => setItems((list) => (list.some((x) => x.id === doc.id) ? list.map((x) => (x.id === doc.id ? doc : x)) : [doc, ...list]));
  const act = async (path, body, msg) => {
    try { const { data } = await http.post(path, body, await withAuth(getToken)); replace(data); toast.success(msg); }
    catch (e) { toast.error(errorText(e, t("common.error"))); }
  };
  const shown = useMemo(() => (items || []).filter((s) => (view === "archived" ? s.archived : !s.archived) && JSON.stringify([s.name, s.official_name, s.id]).toLowerCase().includes(q.toLowerCase())), [items, q, view]);

  if (error) return <ErrorState onRetry={() => { setError(false); load(); }} />;
  if (!items) return <Loading />;
  return (
    <>
      <p data-testid="admin-ai-status" className={`mb-6 flex items-start gap-3 rounded-2xl p-4 text-sm ${system?.gemini_configured ? "bg-[#ECFCCB] text-[#2F4207]" : "bg-[#FFFBEB] text-[#5B3A00] border border-amber-300"}`}>
        {system?.gemini_configured ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
        {system?.gemini_configured ? t("admin.aiOk", { model: system.gemini_model }) : t("admin.aiMissing")}
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1"><span className="sr-only">{t("admin.search")}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.search")} data-testid="admin-search-input" className="h-12 w-full rounded-full border border-[#DADAD4] bg-white pl-10 pr-4 outline-none focus:border-[#0B0B0C]" />
        </label>
        {["active", "archived"].map((v) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className="chip" data-testid={`admin-view-${v}`}>{t(`admin.${v}`)} ({(items || []).filter((s) => (v === "archived") === !!s.archived).length})</button>)}
        <button onClick={() => setEditing(null)} data-testid="admin-add-scheme-btn" className="btn-lime"><Plus className="h-4 w-4" aria-hidden />{t("admin.add")}</button>
      </div>
      <div className="grid gap-3">
        {shown.map((s) => (
          <article key={s.id} data-testid={`admin-scheme-row-${s.id}`} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><Link to={`/scheme/${s.id}`} className="font-semibold hover:underline">{loc(s.name, lang)}</Link><StatusBadge scheme={s} /><JurisdictionBadge scheme={s} /></div>
              <p className="mt-1 text-xs text-[#71717A]">
                {t("common.lastChecked")}: {s.last_checked || t("common.notCheckedYet")} · {t("admin.translations")}: हि {t(`admin.trStatus.${s.translation_status.hi}`)}, বা {t(`admin.trStatus.${s.translation_status.bn}`)} ·{" "}
                <a href={s.official_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline" data-testid={`admin-source-link-${s.id}`}>{t("admin.sourceLink")}<ExternalLink className="h-3 w-3" aria-hidden /></a>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setEditing(s)} className="btn-ghost min-h-[40px] text-sm" data-testid={`admin-edit-${s.id}`}>{t("admin.edit")}</button>
              {!s.archived && <button onClick={() => act(`/admin/schemes/${s.id}/verify`, {}, t("admin.verifiedToast"))} className="btn-ink min-h-[40px] text-sm" data-testid={`admin-verify-${s.id}`}>{t("admin.verify")}</button>}
              <button onClick={() => act(`/admin/schemes/${s.id}/archive`, { archived: !s.archived }, t(s.archived ? "admin.restoredToast" : "admin.archivedToast"))} className="btn-ghost min-h-[40px] text-sm" data-testid={`admin-archive-${s.id}`}>{s.archived ? t("admin.restore") : t("admin.archive")}</button>
            </div>
          </article>
        ))}
      </div>
      {editing !== undefined && <AdminSchemeForm key={editing?.id || "new"} open scheme={editing} onClose={() => setEditing(undefined)} onSaved={(d) => { replace(d); setEditing(undefined); }} />}
    </>
  );
}

export default function Admin() {
  const { t, me, isSignedIn } = useApp();
  return (
    <PageWrap>
      <PageTitle title={t("admin.title")} />
      <Show when="signed-out">
        <div className="surface flex flex-wrap items-center gap-4 p-6" data-testid="admin-sign-in-required"><p className="flex-1">{t("admin.signInFirst")}</p><SignInButton><button className="btn-ink" data-testid="admin-sign-in-btn">{t("common.signIn")}</button></SignInButton></div>
      </Show>
      {isSignedIn && !me && <Loading />}
      {me && me.role !== "admin" && <p className="surface p-6" data-testid="admin-not-allowed">{t("admin.notAdmin")}</p>}
      {me?.role === "admin" && (
        <Tabs defaultValue="schemes">
          <TabsList className="mb-6"><TabsTrigger value="schemes" data-testid="admin-tab-schemes">{t("admin.schemesTab")}</TabsTrigger><TabsTrigger value="users" data-testid="admin-tab-users">{t("admin.usersTab")}</TabsTrigger></TabsList>
          <TabsContent value="schemes"><SchemesAdmin /></TabsContent>
          <TabsContent value="users"><Users /></TabsContent>
        </Tabs>
      )}
    </PageWrap>
  );
}
