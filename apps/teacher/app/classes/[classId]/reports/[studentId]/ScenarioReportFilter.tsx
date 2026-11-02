"use client";

export function ScenarioReportFilter({
  action,
  selectedScenario,
  reports,
}: {
  action: string;
  selectedScenario: string;
  reports: Array<{ id: string; title: string }>;
}) {
  if (!reports.length) return <span className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-500">Noch kein Szenario</span>;

  return <form action={action} method="get" className="flex items-center">
    <label htmlFor="report-scenario" className="sr-only">Szenario auswählen</label>
    <select
      id="report-scenario"
      name="scenario"
      defaultValue={selectedScenario}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="max-w-[240px] rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm outline-none focus:border-violet-400"
    >
      {reports.map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}
    </select>
  </form>;
}
