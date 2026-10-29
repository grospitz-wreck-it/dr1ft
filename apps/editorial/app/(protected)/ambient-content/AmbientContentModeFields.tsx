"use client";

import { useState } from "react";

export function AmbientContentModeFields() {
  const [mode, setMode] = useState("evergreen");
  return (
    <>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block"><span className="mb-1.5 block text-[10px] font-semibold tracking-wider text-slate-500">CONTENT-PAKET</span><select name="contentMode" value={mode} onChange={(event) => setMode(event.target.value)} className="control"><option value="evergreen">Evergreen · zeitloser Feed</option><option value="monthly">Monatspaket · aktuelle Themen</option></select></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-semibold tracking-wider text-slate-500">THEMA / MONAT / SAISON</span><input name="theme" defaultValue="" placeholder="z. B. Herbst, Schulstart, Gaming-Abend …" className="control"/></label>
      </div>
      {mode === "monthly" && (
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
          <label className="mb-2 block text-xs font-semibold text-slate-700">REDAKTIONELLES TREND-BRIEFING</label>
          <textarea name="trendBrief" rows={4} maxLength={6000} placeholder="Verifizierte aktuelle Themen, Releases, Memes oder Jugendtrends mit kurzem Kontext einfügen. Der Generator verwendet nur diese Hinweise als konkrete Trends und erfindet keine Trend-Fakten." className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400"/>
          <p className="mt-2 text-xs leading-5 text-slate-500">Optional, aber empfohlen: recherchierte Themen mit Quelle oder Kontext. Ohne Briefing nutzt der Generator saisonale Alltagsthemen, behauptet aber keine verifizierten viralen Trends.</p>
        </div>
      )}
    </>
  );
}
