"use client";

import { useState } from "react";
import { Building2, MoreHorizontal, Pencil, Plus, Save, UserRound, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

type School = { id: string; name: string; region: string | null; email_domain: string | null; school_type: string | null; street: string | null; house_number: string | null; postal_code: string | null; city: string | null; phone: string | null; website: string | null; student_count: number | null; status: string; plan: string; funding_type: string; internal_notes: string | null; school_image_path: string | null; school_image_position_x: number; school_image_position_y: number; school_image_zoom: number; created_at: string; updated_at: string };
type Member = { id: string; user_id: string; email: string | null; display_name: string | null; role: string; active: boolean; created_at: string };
type Stats = { total: number; teachers: number; admins: number; leads: number; classes: number };
type SchoolClass = { id: string; name: string; grade_level: number | null; school_year: string; access_code: string | null; is_active: boolean; created_at: string; teachers: string[]; student_count?: number; scenario: { id: string; title: string; description: string | null; age_rating: string; is_active: boolean; assigned_at: string } | null };

function client() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }
const ROLE_LABELS: Record<string, string> = { teacher: "Lehrkraft", school_lead: "Schulleitung", school_admin: "Schuladmin" };
const PLAN_LABELS: Record<string, string> = { free: "Free", starter: "Starter", school: "School", growth: "Growth", enterprise: "Enterprise" };
const FUNDING_LABELS: Record<string, string> = { none: "Keine Förderung", sponsored: "Sponsored", grant: "Förderung" };
const TYPE_LABELS: Record<string, string> = { grundschule: "Grundschule", hauptschule: "Hauptschule", realschule: "Realschule", gesamtschule: "Gesamtschule", gymnasium: "Gymnasium", berufskolleg: "Berufskolleg", sonstige: "Sonstige" };
const REGION_OPTIONS = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
] as const;

const REGION_ALIASES: Record<string, string> = {
  BW: "Baden-Württemberg",
  Bayern: "Bayern",
  BE: "Berlin",
  Brandenburg: "Brandenburg",
  HB: "Bremen",
  Bremen: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NRW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thüringen",
};

function regionLabel(value: string | null) {
  return value ? REGION_ALIASES[value] ?? value : "—";
}



export function SchoolDetailWorkspace({ school: initialSchool, initialMembers, initialClasses, stats }: { school: School; initialMembers: Member[]; initialClasses: SchoolClass[]; stats: Stats }) {
  const [school, setSchool] = useState(initialSchool); const [members, setMembers] = useState(initialMembers); const [tab, setTab] = useState<"overview" | "classes" | "people" | "insights" | "settings">("overview");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initialSchool);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [imagePositionX, setImagePositionX] = useState(initialSchool.school_image_position_x ?? 50);
  const [imagePositionY, setImagePositionY] = useState(initialSchool.school_image_position_y ?? 50);
  const [imageZoom, setImageZoom] = useState(initialSchool.school_image_zoom ?? 1); const [showInvite, setShowInvite] = useState(false); const [email, setEmail] = useState(""); const [displayName, setDisplayName] = useState(""); const [role, setRole] = useState("teacher"); const [editingMemberId, setEditingMemberId] = useState<string | null>(null); const [editingMemberName, setEditingMemberName] = useState(""); const [pendingId, setPendingId] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);

  const activeMembers = members.filter((m) => m.active);
  function field<K extends keyof School>(key: K, value: School[K]) { setForm((current) => ({ ...current, [key]: value })); }

  async function uploadSchoolImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setImageMessage("Bitte eine Bilddatei auswählen.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setImageMessage("Das Bild darf maximal 8 MB groß sein.");
      return;
    }

    setImageUploading(true);
    setImageMessage(null);

    try {
      const supabase = client();
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${school.id}/school-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("school-images")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("schools")
        .update({
          school_image_path: path,
          school_image_position_x: imagePositionX,
          school_image_position_y: imagePositionY,
          school_image_zoom: imageZoom,
          updated_at: new Date().toISOString(),
        })
        .eq("id", school.id);

      if (updateError) throw updateError;

      const nextSchool = {
        ...school,
        school_image_path: path,
        school_image_position_x: imagePositionX,
        school_image_position_y: imagePositionY,
        school_image_zoom: imageZoom,
      };

      setSchool(nextSchool);
      setForm((current) => ({
        ...current,
        school_image_path: path,
        school_image_position_x: imagePositionX,
        school_image_position_y: imagePositionY,
        school_image_zoom: imageZoom,
      }));

      setImageMessage("Schulbild gespeichert.");
    } catch (error) {
      setImageMessage(
        error instanceof Error ? error.message : "Schulbild konnte nicht gespeichert werden."
      );
    } finally {
      setImageUploading(false);
    }
  }

  async function deleteSchoolImage() {
    if (!school.school_image_path) return;

    setImageUploading(true);
    setImageMessage(null);

    try {
      const supabase = client();

      const { error: storageError } = await supabase.storage
        .from("school-images")
        .remove([school.school_image_path]);

      if (storageError) throw storageError;

      const { error: updateError } = await supabase
        .from("schools")
        .update({
          school_image_path: null,
          school_image_position_x: 50,
          school_image_position_y: 50,
          school_image_zoom: 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", school.id);

      if (updateError) throw updateError;

      const nextSchool = {
        ...school,
        school_image_path: null,
        school_image_position_x: 50,
        school_image_position_y: 50,
        school_image_zoom: 1,
      };

      setSchool(nextSchool);
      setForm((current) => ({
        ...current,
        school_image_path: null,
        school_image_position_x: 50,
        school_image_position_y: 50,
        school_image_zoom: 1,
      }));

      setImagePositionX(50);
      setImagePositionY(50);
      setImageZoom(1);
      setImageMessage("Schulbild entfernt.");
    } catch (error) {
      setImageMessage(
        error instanceof Error ? error.message : "Schulbild konnte nicht entfernt werden."
      );
    } finally {
      setImageUploading(false);
    }
  }

  async function saveImagePosition() {
    setImageUploading(true);
    setImageMessage(null);

    try {
      const supabase = client();

      const { error } = await supabase
        .from("schools")
        .update({
          school_image_position_x: imagePositionX,
          school_image_position_y: imagePositionY,
          school_image_zoom: imageZoom,
          updated_at: new Date().toISOString(),
        })
        .eq("id", school.id);

      if (error) throw error;

      setSchool((current) => ({
        ...current,
        school_image_position_x: imagePositionX,
        school_image_position_y: imagePositionY,
        school_image_zoom: imageZoom,
      }));

      setForm((current) => ({
        ...current,
        school_image_position_x: imagePositionX,
        school_image_position_y: imagePositionY,
        school_image_zoom: imageZoom,
      }));

      setImageMessage("Bildposition gespeichert.");
    } catch (error) {
      setImageMessage(
        error instanceof Error ? error.message : "Bildposition konnte nicht gespeichert werden."
      );
    } finally {
      setImageUploading(false);
    }
  }

  async function saveSchool(e: React.FormEvent) { e.preventDefault(); setPendingId("school"); setMessage(null); try { const supabase = client(); const { data, error } = await supabase.from("schools").update({ name: form.name, region: form.region || null, email_domain: form.email_domain || null, school_type: form.school_type || null, street: form.street || null, house_number: form.house_number || null, postal_code: form.postal_code || null, city: form.city || null, phone: form.phone || null, website: form.website || null, student_count: form.student_count === null ? null : Number(form.student_count), status: form.status, plan: form.plan, funding_type: form.funding_type, internal_notes: form.internal_notes || null, updated_at: new Date().toISOString() }).eq("id", school.id).select("*").single(); if (error) throw error; setSchool(data); setForm(data); setEditing(false); setMessage("Schulprofil gespeichert."); } catch (error) { setMessage(error instanceof Error ? error.message : "Schulprofil konnte nicht gespeichert werden."); } finally { setPendingId(null); } }

  async function invite(e: React.FormEvent) { e.preventDefault(); setPendingId("invite"); setMessage(null); try { const supabase = client(); const { data: { session } } = await supabase.auth.getSession(); const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/provision-school-user`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ schoolId: school.id, email, displayName, role }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Einladung fehlgeschlagen"); setEmail(""); setDisplayName(""); setRole("teacher"); setShowInvite(false); setMessage("Einladung versendet und Schulrolle angelegt."); window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Einladung fehlgeschlagen"); } finally { setPendingId(null); } }
  async function changeRole(member: Member, nextRole: string) { if (nextRole === member.role) return; setPendingId(member.id); setMessage(null); const { error } = await client().from("school_memberships").update({ role: nextRole }).eq("id", member.id); if (error) setMessage(error.message); else { setMembers((c) => c.map((m) => m.id === member.id ? { ...m, role: nextRole } : m)); setMessage(`${member.display_name || member.email || "Person"} ist jetzt ${ROLE_LABELS[nextRole]}.`); } setPendingId(null); }
  async function setActive(member: Member, active: boolean) { setPendingId(member.id); const { error } = await client().from("school_memberships").update({ active }).eq("id", member.id); if (error) setMessage(error.message); else { setMembers((c) => c.map((m) => m.id === member.id ? { ...m, active } : m)); setMessage(active ? "Person wieder aktiviert." : "Person deaktiviert."); } setPendingId(null); }
  async function remove(member: Member) { if (!window.confirm(`${member.display_name || member.email || "Diese Person"} wirklich aus der Schule entfernen?`)) return; setPendingId(member.id); const { error } = await client().from("school_memberships").delete().eq("id", member.id); if (error) setMessage(error.message); else { setMembers((c) => c.filter((m) => m.id !== member.id)); setMessage("Person aus der Schule entfernt."); } setPendingId(null); }

  async function saveMemberName(member: Member) {
    const name = editingMemberName.trim();
    if (!name) {
      setMessage("Bitte einen Namen eingeben.");
      return;
    }

    setPendingId(member.id);
    setMessage(null);

    const { error } = await client()
      .from("user_profiles")
      .update({ display_name: name })
      .eq("id", member.user_id);

    if (error) {
      setMessage(error.message);
    } else {
      setMembers((current) =>
        current.map((item) =>
          item.id === member.id ? { ...item, display_name: name } : item
        )
      );
      setEditingMemberId(null);
      setEditingMemberName("");
      setMessage("Name gespeichert.");
    }

    setPendingId(null);
  }

  return <>
    <section className="relative mt-6 overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
      {school.school_image_path ? (
        <img
          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/school-images/${school.school_image_path}`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: `${school.school_image_position_x ?? 50}% ${school.school_image_position_y ?? 50}%`,
            transform: `scale(${school.school_image_zoom ?? 1})`,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,.65),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(168,85,247,.45),transparent_35%)]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/20" />

      <div className="relative min-h-[360px] p-6 sm:p-8">
        <div className="flex min-h-[310px] flex-col justify-between">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
                <Building2 className="h-3.5 w-3.5" />
                DR1FT School
              </span>

              <span className={`rounded-full px-3 py-1.5 text-[11px] font-semibold backdrop-blur ${
                school.status === "active"
                  ? "bg-emerald-400/20 text-emerald-100"
                  : "bg-black/20 text-white/70"
              }`}>
                {school.status === "active" ? "Aktiv" : school.status}
              </span>
            </div>

            <div className="flex gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-black/25 px-3.5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-black/35">
                <Plus className="h-4 w-4" />
                {imageUploading ? "Wird gespeichert…" : "Schulbild ändern"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={imageUploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadSchoolImage(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              {school.school_image_path && (
                <button
                  type="button"
                  onClick={() => void deleteSchoolImage()}
                  disabled={imageUploading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/25 px-3.5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Entfernen
                </button>
              )}
            </div>
          </div>

          <div className="max-w-3xl">
            <p className="text-sm font-medium text-white/55">
              {regionLabel(school.region)}
              {school.school_type && (
                <>
                  <span className="mx-2 text-white/25">•</span>
                  {TYPE_LABELS[school.school_type] ?? school.school_type}
                </>
              )}
            </p>

            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              {school.name}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
              Schulprofil, Klassen, Lehrkräfte und DR1FT-Zugänge zentral verwalten.
            </p>

            {imageMessage && (
              <p className="mt-3 text-xs font-medium text-white/70">
                {imageMessage}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                Schüler:innen
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {school.student_count?.toLocaleString("de-DE") ?? "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                Lehrkräfte
              </p>
              <p className="mt-1 text-2xl font-semibold">{stats.teachers}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                Klassen
              </p>
              <p className="mt-1 text-2xl font-semibold">{stats.classes}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                DR1FT-Plan
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {PLAN_LABELS[school.plan] ?? school.plan}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div className="mt-8 flex flex-wrap items-center gap-1 border-b border-border"><button onClick={() => setTab("overview")} className={`rounded-t-xl border-b-2 px-3 pb-3 pt-2 text-sm font-medium transition ${tab === "overview" ? "border-accent bg-accent/5 text-slate-900" : "border-transparent text-slate-500 hover:bg-canvas hover:text-slate-800"}`}>Übersicht</button><button onClick={() => setTab("classes")} className={`rounded-t-xl border-b-2 px-3 pb-3 pt-2 text-sm font-medium transition ${tab === "classes" ? "border-accent bg-accent/5 text-slate-900" : "border-transparent text-slate-500 hover:bg-canvas hover:text-slate-800"}`}>Klassen & Lehrkräfte</button><button onClick={() => setTab("insights")} className={`rounded-t-xl border-b-2 px-3 pb-3 pt-2 text-sm font-medium transition ${tab === "insights" ? "border-accent bg-accent/5 text-slate-900" : "border-transparent text-slate-500 hover:bg-canvas hover:text-slate-800"}`}>Insights</button><button onClick={() => setTab("people")} className={`rounded-t-xl border-b-2 px-3 pb-3 pt-2 text-sm font-medium transition ${tab === "people" ? "border-accent bg-accent/5 text-slate-900" : "border-transparent text-slate-500 hover:bg-canvas hover:text-slate-800"}`}>Personen & Rollen</button><button onClick={() => setTab("settings")} className={`rounded-t-xl border-b-2 px-3 pb-3 pt-2 text-sm font-medium transition ${tab === "settings" ? "border-accent bg-accent/5 text-slate-900" : "border-transparent text-slate-500 hover:bg-canvas hover:text-slate-800"}`}>Schulprofil</button></div>
    {message && <div className="mt-5 rounded-xl border border-border bg-panel px-4 py-3 text-sm text-slate-700">{message}</div>}
    {school.school_image_path && (
      <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-border bg-panel shadow-sm">
        <div className="border-b border-border px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Schulbild
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">
            Bildausschnitt anpassen
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Position und Zoom bestimmen, welcher Ausschnitt im Schul-Header angezeigt wird.
          </p>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.5fr_.75fr]">

          <div className="overflow-hidden rounded-2xl bg-slate-950">
            <div className="relative aspect-[16/6] min-h-[220px] overflow-hidden">
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/school-images/${school.school_image_path}`}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  objectPosition: `${imagePositionX}% ${imagePositionY}%`,
                  transform: `scale(${imageZoom})`,
                }}
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

              <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs font-medium text-white backdrop-blur">
                Vorschau des Schul-Headers
              </div>
            </div>
          </div>

          <div className="space-y-5">

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  Horizontal
                </label>
                <span className="text-xs font-mono text-slate-400">
                  {imagePositionX}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={imagePositionX}
                onChange={(event) => setImagePositionX(Number(event.target.value))}
                className="mt-3 w-full accent-indigo-600"
              />

              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>Links</span>
                <span>Rechts</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  Vertikal
                </label>
                <span className="text-xs font-mono text-slate-400">
                  {imagePositionY}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={imagePositionY}
                onChange={(event) => setImagePositionY(Number(event.target.value))}
                className="mt-3 w-full accent-indigo-600"
              />

              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>Oben</span>
                <span>Unten</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  Zoom
                </label>
                <span className="text-xs font-mono text-slate-400">
                  {imageZoom.toFixed(2)}×
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="2.5"
                step="0.05"
                value={imageZoom}
                onChange={(event) => setImageZoom(Number(event.target.value))}
                className="mt-3 w-full accent-indigo-600"
              />

              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>100 %</span>
                <span>250 %</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setImagePositionX(50);
                  setImagePositionY(50);
                  setImageZoom(1);
                }}
                className="rounded-xl border border-border px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-canvas"
              >
                Zurücksetzen
              </button>

              <button
                type="button"
                onClick={() => void saveImagePosition()}
                disabled={imageUploading}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {imageUploading ? "Speichert…" : "Bildausschnitt speichern"}
              </button>
            </div>

          </div>
        </div>
      </section>
    )}



    {tab === "overview" && <section className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><div className="rounded-3xl border border-border bg-panel p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-slate-500"><Building2 className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-900">Schulprofil</h2><p className="mt-1 text-sm text-slate-500">Stammdaten, Schulgröße und aktueller DR1FT-Plan.</p></div></div><dl className="mt-6 grid gap-5 sm:grid-cols-2"><div><dt className="text-xs text-slate-400">Schulform</dt><dd className="mt-1 text-sm font-medium text-slate-800">{TYPE_LABELS[school.school_type ?? ""] ?? school.school_type ?? "Nicht hinterlegt"}</dd></div><div><dt className="text-xs text-slate-400">Region</dt><dd className="mt-1 text-sm font-medium text-slate-800">{regionLabel(school.region)}</dd></div><div><dt className="text-xs text-slate-400">Schul-Domain</dt><dd className="mt-1 text-sm font-medium text-slate-800">{school.email_domain ? `@${school.email_domain}` : "Nicht hinterlegt"}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-slate-400">Anschrift</dt><dd className="mt-1 text-sm font-medium text-slate-800">{[school.street,school.house_number].filter(Boolean).join(" ") || "—"}{school.postal_code || school.city ? ` · ${[school.postal_code,school.city].filter(Boolean).join(" ")}` : ""}</dd></div><div><dt className="text-xs text-slate-400">Förderstatus</dt><dd className="mt-1 text-sm font-medium text-slate-800">{FUNDING_LABELS[school.funding_type] ?? school.funding_type}</dd></div></dl><button onClick={() => { setForm(school); setEditing(true); setTab("settings"); }} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-canvas"><Pencil className="h-4 w-4" /> Schulprofil bearbeiten</button></div><div className="rounded-3xl border border-border bg-panel p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Administration</p><h2 className="mt-2 font-semibold text-slate-900">Zugänge verwalten</h2><p className="mt-2 text-sm leading-6 text-slate-500">Lehrkräfte, Schulleitung und Schuladmins zentral verwalten.</p><button onClick={() => { setTab("people"); setShowInvite(true); }} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white"><Plus className="h-4 w-4" /> Person einladen</button></div></section>}

    {tab === "classes" && <section className="mt-6 space-y-5">
      <div className="flex flex-col gap-5 rounded-[1.75rem] border border-border bg-panel p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Schulbetrieb</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Klassen & Lehrkräfte</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Klasseninstanzen, Besetzung, Schülerzahlen und aktive DR1FT-Szenarien auf einen Blick.
          </p>
        </div>

        <a
          href="https://lehrkraft.dr1ft.de/classes"
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          Teacher-Dashboard öffnen →
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-panel p-4">
          <p className="text-xs font-medium text-slate-400">Klassen gesamt</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{initialClasses.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-4">
          <p className="text-xs font-medium text-slate-400">Aktiv</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{initialClasses.filter((c) => c.is_active).length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-4">
          <p className="text-xs font-medium text-slate-400">Mit Szenario</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{initialClasses.filter((c) => c.scenario).length}</p>
        </div>
      </div>

      {initialClasses.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {initialClasses.map((c) => (
            <article
              key={c.id}
              className="group overflow-hidden rounded-[1.5rem] border border-border bg-panel shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative overflow-hidden bg-slate-950 p-5 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(139,92,246,.38),transparent_40%),radial-gradient(circle_at_10%_100%,rgba(59,130,246,.28),transparent_45%)]" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                          {c.school_year}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          c.is_active
                            ? "bg-emerald-400/15 text-emerald-200"
                            : "bg-white/10 text-white/55"
                        }`}>
                          {c.is_active ? "Aktiv" : "Pausiert"}
                        </span>
                      </div>

                      <h3 className="mt-4 truncate text-xl font-semibold tracking-tight">
                        {c.name}
                      </h3>

                      <p className="mt-1 text-sm text-white/55">
                        {c.grade_level ? `Jahrgang ${c.grade_level}` : "Jahrgang nicht hinterlegt"}
                      </p>
                    </div>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-bold text-white">
                      {c.grade_level ?? "—"}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Schüler:innen</p>
                      <p className="mt-1 text-lg font-semibold">{c.student_count ?? 0}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Lehrkräfte</p>
                      <p className="mt-1 text-lg font-semibold">{c.teachers.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="rounded-2xl bg-canvas p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">Aktives Szenario</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {c.scenario?.title ?? "Noch kein Szenario"}
                      </p>
                    </div>

                    {c.scenario && (
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-border">
                        {c.scenario.age_rating === "all_ages"
                          ? "Alle Altersstufen"
                          : c.scenario.age_rating === "12_plus"
                            ? "Ab 12"
                            : c.scenario.age_rating === "16_plus"
                              ? "Ab 16"
                              : c.scenario.age_rating}
                      </span>
                    )}
                  </div>

                  {c.scenario?.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                      {c.scenario.description}
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Lehrkräfte
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.teachers.length ? (
                      c.teachers.map((teacher) => (
                        <span
                          key={teacher}
                          className="inline-flex items-center rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                        >
                          {teacher}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">
                        Noch keine Lehrkraft zugeordnet
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="text-xs text-slate-400">
                    Klasseninstanz · angelegt {new Date(c.created_at).toLocaleDateString("de-DE")}
                    {c.access_code && (
                      <span className="ml-2 rounded-md bg-canvas px-2 py-1 font-mono text-[10px] text-slate-500">
                        Code {c.access_code}
                      </span>
                    )}
                  </div>

                  <a
                    href={`https://lehrkraft.dr1ft.de/classes/${c.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-xl border border-border px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-canvas"
                  >
                    Klasse öffnen →
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-panel p-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Noch keine Klassen angelegt</p>
          <p className="mt-1 text-sm text-slate-500">
            Sobald Lehrkräfte Klasseninstanzen erstellen, erscheinen sie hier.
          </p>
        </div>
      )}
    </section>}

    {tab === "insights" && <section className="mt-6 space-y-5">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(139,92,246,.38),transparent_38%),radial-gradient(circle_at_10%_100%,rgba(59,130,246,.28),transparent_45%)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">DR1FT Insights</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Schule im Überblick</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                Struktur, Zugänge und Klassen deiner Schule – kompakt zusammengefasst.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70">
              Live aus DR1FT
            </span>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Schüler:innen</p>
              <p className="mt-1 text-2xl font-semibold">{school.student_count?.toLocaleString("de-DE") ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Klassen</p>
              <p className="mt-1 text-2xl font-semibold">{stats.classes}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Lehrkräfte</p>
              <p className="mt-1 text-2xl font-semibold">{stats.teachers}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Administration</p>
              <p className="mt-1 text-2xl font-semibold">{stats.leads + stats.admins}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[1.5rem] border border-border bg-panel p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Schulstruktur</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Kapazität & Organisation</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-sm font-bold text-slate-600">
              {stats.classes}
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Schüler:innen</span>
                <strong className="text-slate-900">{school.student_count?.toLocaleString("de-DE") ?? "—"}</strong>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Klassen</span>
                <strong className="text-slate-900">{stats.classes}</strong>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas">
                <div className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 ${
                  stats.classes > 0 ? "w-full" : "w-0"
                }`} />
              </div>
            </div>

            <div className="rounded-2xl bg-canvas p-4">
              <p className="text-xs font-medium text-slate-400">Ø Schüler:innen pro Klasse</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">
                {stats.classes > 0 && school.student_count
                  ? Math.round(school.student_count / stats.classes)
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border bg-panel p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Zugänge</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">Team & Berechtigungen</h3>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-canvas p-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Lehrkräfte</p>
                <p className="mt-0.5 text-xs text-slate-400">Unterrichten mit DR1FT</p>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white">
                {stats.teachers}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border bg-canvas p-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Schulleitung</p>
                <p className="mt-0.5 text-xs text-slate-400">Leitungszugänge</p>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700">
                {stats.leads}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border bg-canvas p-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Schuladmins</p>
                <p className="mt-0.5 text-xs text-slate-400">Administrationszugänge</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
                {stats.admins}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-[1.5rem] border border-border bg-panel p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">DR1FT-Betrieb</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">Szenario-Abdeckung</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Wie viele deiner Klassen bereits mit einem DR1FT-Szenario arbeiten.
          </p>

          <div className="mt-6 flex items-end gap-6">
            <div className="text-4xl font-semibold tracking-tight text-slate-950">
              {initialClasses.filter((c) => c.scenario).length}
              <span className="ml-1 text-lg font-medium text-slate-400">/ {initialClasses.length}</span>
            </div>
            <div className="pb-1 text-sm text-slate-500">
              Klassen mit Szenario
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all"
              style={{
                width: initialClasses.length
                  ? `${Math.round((initialClasses.filter((c) => c.scenario).length / initialClasses.length) * 100)}%`
                  : "0%",
              }}
            />
          </div>

          <p className="mt-3 text-xs text-slate-400">
            {initialClasses.length
              ? `${Math.round((initialClasses.filter((c) => c.scenario).length / initialClasses.length) * 100)} % der Klassen sind mit einem Szenario ausgestattet.`
              : "Noch keine Klassen vorhanden."}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-border bg-panel p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Status</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">Schulbetrieb</h3>

          <div className="mt-6 flex items-center gap-4 rounded-2xl bg-canvas p-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              school.status === "active"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-600"
            }`}>
              <span className="h-3 w-3 rounded-full bg-current" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {school.status === "active" ? "Schule aktiv" : "Schulbetrieb nicht aktiv"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Plan: {PLAN_LABELS[school.plan] ?? school.plan}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border p-4">
            <p className="text-xs text-slate-400">Förderstatus</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {FUNDING_LABELS[school.funding_type] ?? school.funding_type}
            </p>
          </div>
        </div>
      </div>
    </section>}

    {tab === "settings" && <section className="mt-6 space-y-5">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(139,92,246,.38),transparent_38%),radial-gradient(circle_at_10%_100%,rgba(59,130,246,.28),transparent_45%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Administration</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Schulprofil</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Stammdaten, Kontaktdaten und organisatorische Einstellungen deiner Schule.
            </p>
          </div>

          {!editing && (
            <button
              onClick={() => { setForm(school); setEditing(true); }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-950 shadow-sm transition hover:bg-white/90"
            >
              <Pencil className="h-4 w-4" />
              Profil bearbeiten
            </button>
          )}
        </div>

        {!editing && (
          <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Status</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  school.status === "active" ? "bg-emerald-400" : "bg-slate-500"
                }`} />
                <span className="text-sm font-semibold">
                  {school.status === "active" ? "Aktiv" : school.status === "suspended" ? "Gesperrt" : "Inaktiv"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">DR1FT-Plan</p>
              <p className="mt-2 text-sm font-semibold">
                {PLAN_LABELS[school.plan] ?? school.plan}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Förderung</p>
              <p className="mt-2 text-sm font-semibold">
                {FUNDING_LABELS[school.funding_type] ?? school.funding_type}
              </p>
            </div>
          </div>
        )}
      </div>

      {editing ? (
        <form onSubmit={saveSchool} className="space-y-5">
          <div className="rounded-[1.5rem] border border-border bg-panel p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Identität</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Grunddaten</h3>
              <p className="mt-1 text-sm text-slate-500">Wie die Schule innerhalb von DR1FT geführt wird.</p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Schulname
                <input required value={form.name} onChange={(e) => field("name", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Schulform
                <select value={form.school_type ?? ""} onChange={(e) => field("school_type", e.target.value || null)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10">
                  <option value="">Nicht festgelegt</option>
                  {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Bundesland
                <select value={regionLabel(form.region) === "—" ? "" : regionLabel(form.region)} onChange={(e) => field("region", e.target.value || null)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10">
                  <option value="">Nicht festgelegt</option>
                  {REGION_OPTIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Schülerzahl
                <input type="number" min="0" value={form.student_count ?? ""} onChange={(e) => field("student_count", e.target.value === "" ? null : Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
              </label>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-panel p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Kontakt</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Adresse & Erreichbarkeit</h3>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Straße
                <input value={form.street ?? ""} onChange={(e) => field("street", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Hausnummer
                <input value={form.house_number ?? ""} onChange={(e) => field("house_number", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                PLZ
                <input value={form.postal_code ?? ""} onChange={(e) => field("postal_code", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Ort
                <input value={form.city ?? ""} onChange={(e) => field("city", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Telefon
                <input value={form.phone ?? ""} onChange={(e) => field("phone", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Website
                <input value={form.website ?? ""} onChange={(e) => field("website", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" />
              </label>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-panel p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">DR1FT-Konfiguration</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Zugang & Organisation</h3>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Schul-Domain
                <input value={form.email_domain ?? ""} onChange={(e) => field("email_domain", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" placeholder="schule.de" />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Status
                <select value={form.status} onChange={(e) => field("status", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10">
                  <option value="active">Aktiv</option>
                  <option value="inactive">Inaktiv</option>
                  <option value="suspended">Gesperrt</option>
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Plan
                <select value={form.plan} onChange={(e) => field("plan", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10">
                  {Object.entries(PLAN_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Förderstatus
                <select value={form.funding_type} onChange={(e) => field("funding_type", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10">
                  <option value="none">Keine Förderung</option>
                  <option value="sponsored">Sponsored</option>
                  <option value="grant">Förderung</option>
                </select>
              </label>

              <label className="text-sm font-medium md:col-span-2 text-slate-700">
                Interne Notiz
                <textarea value={form.internal_notes ?? ""} onChange={(e) => field("internal_notes", e.target.value)} className="mt-1.5 min-h-28 w-full rounded-xl border border-border bg-white px-3 py-2.5 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10" placeholder="Nur für die Redaktion / Administration sichtbar …" />
              </label>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => { setForm(school); setEditing(false); }}
              className="rounded-xl border border-border bg-panel px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-canvas"
            >
              Abbrechen
            </button>
            <button
              disabled={pendingId === "school"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {pendingId === "school" ? "Speichert …" : "Änderungen speichern"}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-border bg-panel p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Identität</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">Schule</h3>

            <dl className="mt-6 space-y-4">
              <div className="flex items-start justify-between gap-5 border-b border-border pb-4">
                <dt className="text-sm text-slate-400">Schulname</dt>
                <dd className="text-right text-sm font-semibold text-slate-900">{school.name}</dd>
              </div>
              <div className="flex items-start justify-between gap-5 border-b border-border pb-4">
                <dt className="text-sm text-slate-400">Schulform</dt>
                <dd className="text-right text-sm font-semibold text-slate-900">{TYPE_LABELS[school.school_type ?? ""] ?? school.school_type ?? "Nicht hinterlegt"}</dd>
              </div>
              <div className="flex items-start justify-between gap-5 border-b border-border pb-4">
                <dt className="text-sm text-slate-400">Bundesland</dt>
                <dd className="text-right text-sm font-semibold text-slate-900">{regionLabel(school.region)}</dd>
              </div>
              <div className="flex items-start justify-between gap-5">
                <dt className="text-sm text-slate-400">Schülerzahl</dt>
                <dd className="text-right text-sm font-semibold text-slate-900">{school.student_count?.toLocaleString("de-DE") ?? "Nicht hinterlegt"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-panel p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Kontakt</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">Adresse & Erreichbarkeit</h3>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-canvas p-4">
                <p className="text-xs text-slate-400">Anschrift</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {[school.street, school.house_number].filter(Boolean).join(" ") || "Nicht hinterlegt"}
                </p>
                {(school.postal_code || school.city) && (
                  <p className="mt-0.5 text-sm text-slate-500">
                    {[school.postal_code, school.city].filter(Boolean).join(" ")}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs text-slate-400">Telefon</p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">{school.phone || "Nicht hinterlegt"}</p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs text-slate-400">Website</p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">{school.website || "Nicht hinterlegt"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-panel p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">DR1FT</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">Zugang & Organisation</h3>

            <dl className="mt-6 space-y-4">
              <div className="flex items-start justify-between gap-5 border-b border-border pb-4">
                <dt className="text-sm text-slate-400">Schul-Domain</dt>
                <dd className="text-right text-sm font-semibold text-slate-900">{school.email_domain ? `@${school.email_domain}` : "Nicht hinterlegt"}</dd>
              </div>
              <div className="flex items-start justify-between gap-5 border-b border-border pb-4">
                <dt className="text-sm text-slate-400">Plan</dt>
                <dd className="text-right text-sm font-semibold text-slate-900">{PLAN_LABELS[school.plan] ?? school.plan}</dd>
              </div>
              <div className="flex items-start justify-between gap-5">
                <dt className="text-sm text-slate-400">Förderstatus</dt>
                <dd className="text-right text-sm font-semibold text-slate-900">{FUNDING_LABELS[school.funding_type] ?? school.funding_type}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-panel p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Intern</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">Notizen</h3>
            <div className="mt-6 rounded-2xl bg-canvas p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {school.internal_notes || "Keine interne Notiz hinterlegt."}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>}

    {tab === "people" && <section className="mt-6 space-y-5">
      <div className="flex flex-col gap-5 rounded-[1.75rem] border border-border bg-panel p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Schulteam</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Menschen hinter der Schule</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Verwalte Zugänge, Rollen und Namen deines DR1FT-Schulteams an einem Ort.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Person einladen
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-panel p-4">
          <p className="text-xs font-medium text-slate-400">Aktive Personen</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{activeMembers.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-4">
          <p className="text-xs font-medium text-slate-400">Lehrkräfte</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{stats.teachers}</p>
        </div>
        <div className="rounded-2xl border border-border bg-panel p-4">
          <p className="text-xs font-medium text-slate-400">Schulleitung & Admin</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{stats.leads + stats.admins}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {members.map((member) => {
          const isEditingName = editingMemberId === member.id;
          const roleLabel = ROLE_LABELS[member.role] ?? member.role;
          const initials = (member.display_name || member.email || "?")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("");

          return (
            <article
              key={member.id}
              className={`group relative overflow-hidden rounded-[1.5rem] border bg-panel p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                member.active ? "border-border" : "border-slate-200 bg-slate-50/70"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                  member.active
                    ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20"
                    : "bg-slate-200 text-slate-500"
                }`}>
                  {initials || <UserRound className="h-5 w-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {isEditingName ? (
                      <input
                        autoFocus
                        value={editingMemberName}
                        onChange={(e) => setEditingMemberName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveMemberName(member);
                          }
                          if (e.key === "Escape") {
                            setEditingMemberId(null);
                            setEditingMemberName("");
                          }
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-accent bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 outline-none ring-2 ring-accent/10"
                      />
                    ) : (
                      <h3 className="truncate text-base font-semibold text-slate-950">
                        {member.display_name || "Name nicht hinterlegt"}
                      </h3>
                    )}

                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      member.role === "school_lead"
                        ? "bg-violet-50 text-violet-700"
                        : member.role === "school_admin"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-slate-100 text-slate-600"
                    }`}>
                      {roleLabel}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-sm text-slate-500">{member.email || member.user_id}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {member.active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Aktiv
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                        Deaktiviert
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                {isEditingName ? (
                  <>
                    <button
                      disabled={pendingId === member.id}
                      onClick={() => void saveMemberName(member)}
                      className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {pendingId === member.id ? "Speichert …" : "Namen speichern"}
                    </button>
                    <button
                      disabled={pendingId === member.id}
                      onClick={() => {
                        setEditingMemberId(null);
                        setEditingMemberName("");
                      }}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-slate-600"
                    >
                      Abbrechen
                    </button>
                  </>
                ) : (
                  <button
                    disabled={pendingId === member.id}
                    onClick={() => {
                      setEditingMemberId(member.id);
                      setEditingMemberName(member.display_name ?? "");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-canvas"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Namen bearbeiten
                  </button>
                )}

                <select
                  disabled={pendingId === member.id}
                  value={member.role}
                  onChange={(e) => void changeRole(member, e.target.value)}
                  className="rounded-lg border border-border bg-panel px-3 py-2 text-xs text-slate-700"
                >
                  <option value="teacher">Lehrkraft</option>
                  <option value="school_lead">Schulleitung</option>
                  <option value="school_admin">Schuladmin</option>
                </select>

                <button
                  disabled={pendingId === member.id}
                  onClick={() => void setActive(member, !member.active)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-canvas"
                >
                  {member.active ? "Deaktivieren" : "Aktivieren"}
                </button>

                <button
                  disabled={pendingId === member.id}
                  onClick={() => void remove(member)}
                  className="ml-auto rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                >
                  Entfernen
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {members.length === 0 && (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-panel p-12 text-center">
          <UserRound className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Noch keine Personen zugeordnet</p>
          <p className="mt-1 text-sm text-slate-500">Lade die erste Lehrkraft oder Schulleitung ein.</p>
        </div>
      )}
    </section>}

    {showInvite && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-border bg-panel p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{school.name}</p><h2 className="mt-1 text-xl font-semibold">Person einladen</h2></div><button onClick={() => setShowInvite(false)} className="p-2 text-slate-400"><X className="h-4 w-4" /></button></div><p className="mt-3 text-sm text-slate-500">Die E-Mail-Adresse muss zur hinterlegten Schul-Domain passen.</p><form onSubmit={invite} className="mt-6 space-y-4"><label className="block text-sm font-medium">Name<input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5" /></label><label className="block text-sm font-medium">Schul-E-Mail<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5" /></label><label className="block text-sm font-medium">Rolle<select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5"><option value="teacher">Lehrkraft</option><option value="school_lead">Schulleitung</option><option value="school_admin">Schuladmin</option></select></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowInvite(false)} className="rounded-xl border border-border px-4 py-2.5">Abbrechen</button><button disabled={pendingId === "invite"} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm text-white">{pendingId === "invite" ? "Wird gesendet …" : "Einladung senden"}</button></div></form></div></div>}
  </>;
}
