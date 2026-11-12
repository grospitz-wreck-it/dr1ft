// apps/teacher/app/grades/lookup/page.tsx
// Kleiner Umweg, damit man von einer Klassenseite aus (die nur classId
// kennt) zur Jahrgangs-Übersicht (die school_id+grade_level braucht)
// verlinken kann, ohne dass die Klassenseite selbst diese IDs mitführen muss.

import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

export default async function GradeLookupPage({
  searchParams,
}: {
  searchParams: { classId?: string };
}) {
  const supabase = supabaseServerClient();
  const classId = searchParams.classId;

  if (!classId) {
    return <p className="p-6 text-sm text-status-rejected">classId fehlt.</p>;
  }

  const { data: klass } = await supabase
    .from("classes")
    .select("school_id, grade_level")
    .eq("id", classId)
    .single();

  if (!klass?.school_id || klass.grade_level == null) {
    return (
      <p className="p-6 text-sm text-slate-500">
        Diese Klasse hat keinen Jahrgang/keine Schule hinterlegt — keine
        Jahrgangs-Übersicht möglich.
      </p>
    );
  }

  redirect(`/grades/${klass.school_id}/${klass.grade_level}`);
}
