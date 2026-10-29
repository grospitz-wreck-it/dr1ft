"use client";

import { useState } from "react";
import type { ReactNode, ChangeEvent } from "react";
import type { generateAmbientDrafts } from "./actions";
import { GenerateAmbientButton } from "./GenerateAmbientButton";
import { CheckCircle2, Layers, MessageCircle, Sparkles, Tags, Users } from "lucide-react";

type Action = typeof generateAmbientDrafts;
type Summary = {
  contentMode: string;
  theme: string;
  ageBand: string;
  style: string;
  creator: string;
  count: string;
  model: string;
  interests: string[];
  imageRatio: string;
};
const defaults: Summary = {
  contentMode: "evergreen",
  theme: "",
  ageBand: "14_15",
  style: "mixed",
  creator: "",
  count: "20",
  model: "gemini",
  interests: [],
  imageRatio: "35",
};
const labels: Record<string, Record<string, string>> = {
  contentMode: { evergreen: "Evergreen", monthly: "Monatspaket" },
  ageBand: { "12_13": "12–13 Jahre", "14_15": "14–15 Jahre", "16_17": "16–17 Jahre", "18_plus": "18+ Jahre", all: "Altersneutral" },
  style: { mixed: "Wild Mix", casual: "Locker & natürlich", chatty: "Chatty / Messenger", meme: "Meme-native", deadpan: "Trocken / deadpan", wholesome: "Warm / wholesome", chaotic: "Chaotisch / impulsiv", observational: "Beobachtend", storyteller: "Mini-Storys", minimal: "Minimalistisch" },
};
export function AmbientGeneratorForm({ action, children }: { action: Action; children: ReactNode }) {
  const [summary, setSummary] = useState<Summary>(defaults);
  function updateSummary(event: ChangeEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const rawInterests = String(data.get("interestLabels") ?? "");
    setSummary({
      contentMode: String(data.get("contentMode") ?? defaults.contentMode),
      theme: String(data.get("theme") ?? ""),
      ageBand: String(data.get("ageBand") ?? defaults.ageBand),
      style: String(data.get("style") ?? defaults.style),
      creator: String(data.get("creatorId") ?? ""),
      count: String(data.get("count") ?? defaults.count),
      model: String(data.get("model") ?? defaults.model),
      interests: rawInterests.split(",").map((value) => value.trim()).filter(Boolean),
      imageRatio: String(data.get("imageRatio") ?? defaults.imageRatio),
    });
  }
  const row = (label: string, value: string, icon: ReactNode) => (
    <div className="flex items-start gap-3 py-2.5" key={label}>
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <span className="w-28 shrink-0 text-sm text-slate-500">{label}</span>
      <span className="min-w-0 text-sm font-medium text-slate-900 break-words">{value}</span>
    </div>
  );
  return (
    <form action={action} onChange={updateSummary} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)]">
      <div className="min-w-0 space-y-5">{children}</div>
      <aside className="space-y-4 xl:sticky xl:top-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-600"><Sparkles className="h-4 w-4" /> Dein Produktionsbriefing</div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Alles auf einen Blick</h2>
            <p className="mt-1 text-sm text-slate-500">Die Zusammenfassung aktualisiert sich mit deinen Einstellungen.</p>
          </div>
          <div className="px-5 py-2">
            {row("Content-Paket", labels.contentMode[summary.contentMode] ?? summary.contentMode, <Layers className="h-4 w-4" />)}
            {summary.theme && row("Thema / Saison", summary.theme, <Sparkles className="h-4 w-4" />)}
            {row("Zielgruppe", labels.ageBand[summary.ageBand] ?? summary.ageBand, <Users className="h-4 w-4" />)}
            {row("Schreibstil", labels.style[summary.style] ?? summary.style, <MessageCircle className="h-4 w-4" />)}
            {row("Creator", summary.creator ? "Ausgewählter Creator" : "Automatisch wechseln", <Users className="h-4 w-4" />)}
            {row("Text-Modell", summary.model === "claude" ? "Claude" : "Gemini", <Sparkles className="h-4 w-4" />)}
            {row("Bildanteil", `${summary.imageRatio}%`, <Layers className="h-4 w-4" />)}
            {row("Umfang", `${summary.count} Posts`, <MessageCircle className="h-4 w-4" />)}
            <div className="flex items-start gap-3 border-t border-slate-100 py-3">
              <Tags className="mt-0.5 h-4 w-4 text-slate-400" />
              <span className="w-28 shrink-0 text-sm text-slate-500">Interessen</span>
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {summary.interests.length ? summary.interests.map((interest) => <span key={interest} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{interest}</span>) : <span className="text-sm text-slate-400">Keine priorisiert</span>}
              </div>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><CheckCircle2 className="h-4 w-4 text-violet-600" /> Realistische Vielfalt</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Der Generator variiert Sprache, Rechtschreibung, Emojis, Textlängen und Ton. Interessen-Tags werden pro Post vergeben, nicht pauschal auf den ganzen Batch.</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <GenerateAmbientButton />
          <p className="mt-3 text-center text-xs leading-5 text-slate-500">Alle Ergebnisse werden als DRAFT gespeichert. Nichts wird automatisch veröffentlicht.</p>
        </section>
      </aside>
    </form>
  );
}
