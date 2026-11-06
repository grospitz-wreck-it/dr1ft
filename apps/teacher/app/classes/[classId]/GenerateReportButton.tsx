import Link from "next/link";
import { FileText } from "lucide-react";

export function GenerateReportButton({ classId, studentUserId }: { classId: string; studentUserId: string }) {
  return (
    <Link
      href={`/classes/${classId}/reports/${studentUserId}`}
      title="Modulbezogene Einzelauswertung öffnen"
      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
    >
      <FileText className="h-3.5 w-3.5" />
      Modul-Reports
    </Link>
  );
}
