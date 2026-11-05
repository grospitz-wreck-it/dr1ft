"use client";

import { BarChart3, ShieldCheck } from "lucide-react";

export function ClassDashboardInsights({ classId }: {
  classId: string;
  students: Array<{ user_id: string; display_name: string | null; username: string | null; avatar_seed?: string | null }>;
  activeAssignmentTitle: string | null;
}) {
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-violet-100 bg-[linear-gradient(115deg,#fff_0%,#faf8ff_60%,#f0fbff_100%)] p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><BarChart3 className="h-5 w-5" /></span>
          <div>
            <h3 className="text-base font-bold text-slate-950">Klassenreporting</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Die klassenweite Gesamtauswertung wird gerade auf die neue Rollen- und Modulzuordnung umgestellt. Sie zeigt künftig ausschließlich aggregierte Ergebnisse – keine individuellen Schülerprofile.</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5" /> Klassen- und Schulberichte ohne individuelle Schülerdaten</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-xl border border-violet-100 bg-white/80 px-3 py-2 text-xs font-semibold text-violet-700">In Vorbereitung</span>
      </div>
    </section>
  );
}
