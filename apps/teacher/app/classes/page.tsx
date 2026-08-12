// apps/teacher/app/classes/page.tsx
// Übersicht: alle Klassen, für die der eingeloggte Nutzer Lehrkraft ist.
// Erstellen einer neuen Klasse generiert automatisch einen access_code.

import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { createClass } from "./actions";

export default async function TeacherClassesPage() {
  const supabase = supabaseServerClient();

  const { data: memberships } = await supabase
    .from("class_memberships")
    .select("class_id, role, classes(id, name, access_code, is_active)")
    .in("role", ["teacher", "school_admin"]);

  const classes = (memberships ?? []).map((m: any) => m.classes);

  return (
    <div className="px-6 py-5 max-w-2xl">
      <h1 className="text-lg font-semibold text-slate-900 mb-4">Meine Klassen</h1>

      <ul className="space-y-3 mb-8">
        {classes.map((c: any) => (
          <li key={c.id} className="bg-panel border border-border rounded-lg p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-slate-500">Zugangscode: {c.access_code}</p>
            </div>
            <a
              href={`/classes/${c.id}`}
              className="text-sm underline"
            >
              Übersicht öffnen
            </a>
          </li>
        ))}
      </ul>

      <form action={createClass} className="bg-panel border border-border rounded-lg p-4 space-y-3">
        <h2 className="font-medium">Neue Klasse anlegen</h2>
        <input
          type="text"
          name="name"
          placeholder="z.B. 9b"
          required
          className="border border-border rounded-md px-3 py-2 w-full text-sm"
        />
        <input
          type="number"
          name="gradeLevel"
          placeholder="Jahrgang (z.B. 9)"
          min={1}
          max={13}
          className="border border-border rounded-md px-3 py-2 w-full text-sm"
        />
        <button
          type="submit"
          className="bg-accent hover:bg-accent-hover text-white text-sm px-4 py-2 rounded-md"
        >
          Klasse anlegen
        </button>
        <p className="text-xs2 text-slate-400">
          Der Zugangscode wird automatisch erzeugt und danach auf der
          Klassen-Detailseite angezeigt.
        </p>
      </form>
    </div>
  );
}
