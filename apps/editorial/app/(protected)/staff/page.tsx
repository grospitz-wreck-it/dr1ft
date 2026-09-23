// apps/admin/app/staff/page.tsx

import { Users } from "lucide-react";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";
import { addStaffMember, removeStaffMember, updateStaffRole } from "./actions";

export default async function StaffPage() {
  const supabase = supabaseServerClient();
  const { data: staff, error } = await supabase
    .from("platform_staff")
    .select("*")
    .order("created_at");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="px-6 py-5 max-w-xl">
      <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-slate-400" /> Redaktionsteam
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        Nur sichtbar/bearbeitbar für <code>platform_admin</code>. Deine Auth-ID:{" "}
        <code className="text-xs2 bg-canvas px-1 py-0.5 rounded">{user?.id}</code>
      </p>

      {error && (
        <p className="text-sm text-status-rejected mb-4">
          Kein Zugriff (RLS) — du bist vermutlich kein platform_admin. Erste
          Eintragung muss einmalig per SQL passieren, siehe README.
        </p>
      )}

      <ul className="space-y-2 mb-8">
        {staff?.map((s) => (
          <li key={s.user_id} className="bg-panel border border-border rounded-lg p-3 flex items-center justify-between gap-3">
            <code className="text-xs2 text-slate-500">{s.user_id}</code>
            <form className="flex items-center gap-2">
              <select
                defaultValue={s.role}
                name="role"
                className="border border-border rounded-md px-2 py-1 text-xs"
              >
                <option value="editor">editor</option>
                <option value="reviewer">reviewer</option>
                <option value="platform_admin">platform_admin</option>
              </select>
              <button
                formAction={async (formData: FormData) => {
                  "use server";
                  await updateStaffRole(s.user_id, String(formData.get("role")));
                }}
                className="text-xs border border-border rounded-md px-2 py-1 hover:bg-canvas"
              >
                aktualisieren
              </button>
              <button
                formAction={async () => {
                  "use server";
                  await removeStaffMember(s.user_id);
                }}
                className="text-xs text-status-rejected"
              >
                entfernen
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form action={addStaffMember} className="bg-panel border border-border rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-medium text-slate-700">Neues Mitglied</h2>
        <input
          name="userId"
          placeholder="Supabase Auth-User-ID"
          required
          className="border border-border rounded-md px-3 py-2 w-full text-sm"
        />
        <select name="role" className="border border-border rounded-md px-3 py-2 w-full text-sm">
          <option value="editor">editor</option>
          <option value="reviewer">reviewer</option>
          <option value="platform_admin">platform_admin</option>
        </select>
        <button type="submit" className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2 rounded-md">
          Hinzufügen
        </button>
      </form>
    </div>
  );
}
