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
  if (!reports.length) return <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-500">Kein Szenario</span>;

  return <form action={action} method="get" className="flex items-center">
    <label htmlFor="report-scenario" className="sr-only">Szenario auswählen</label>
    <select
      id="report-scenario"
      name="scenario"
      defaultValue={selectedScenario}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="max-w-[170px] rounded-lg border border-violet-200 bg-white px-2.5 py-2 text-[10px] font-semibold text-slate-700 shadow-sm outline-none focus:border-violet-400 sm:max-w-[190px] sm:text-[11px]"
    >
      {reports.map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}
    </select>
  </form>;
}
