"use client";
// apps/admin/app/content/ContentDetailDrawer.tsx
//
// Bewusst KEIN Seitenwechsel bei Klick auf eine Zeile — bei 1000+
// Einträgen wäre "Liste -> Detail -> zurück -> Liste (Scroll-Position
// weg)" der größte Zeitfresser. Der Drawer rendert bedingt (item
// vorhanden oder nicht), URL trägt ?item=<id>, "Schließen" ist einfach
// ein Link ohne diesen Parameter — kein zusätzlicher Client-State nötig.

import { useState, useTransition } from "react";
import { X, Image as ImageIcon, Sparkles, RefreshCw } from "lucide-react";
import { updateContentItemQuick, updateContentItemStatusQuick } from "./actions";

const MANIPULATION_TECHNIQUES = [
  { value: "framing", label: "Framing", description: "Einordnung durch Wortwahl oder Perspektive" },
  { value: "emotional_framing", label: "Emotionales Framing", description: "Gefühle gezielt als Deutungsrahmen nutzen" },
  { value: "social_proof", label: "Sozialer Druck / Social Proof", description: "Mehrheitsmeinung oder Gruppenzustimmung suggerieren" },
  { value: "false_dichotomy", label: "Falsche Dichotomie", description: "Nur zwei Optionen darstellen, obwohl es mehr gibt" },
  { value: "fear_appeal", label: "Angstappell", description: "Mit Angst oder Bedrohung Druck erzeugen" },
  { value: "misleading_context", label: "Irreführender Kontext", description: "Echte Inhalte in einen falschen Zusammenhang stellen" },
  { value: "cherry_picking", label: "Selektive Belege", description: "Nur passende Informationen zeigen" },
  { value: "false_authority", label: "Falsche Autorität", description: "Unbelegte Expertise oder Autorität vortäuschen" },
  { value: "bandwagon", label: "Mitläufereffekt", description: "Zum Mitmachen bewegen, weil angeblich alle mitmachen" },
  { value: "scapegoating", label: "Sündenbock-Muster", description: "Eine Person oder Gruppe pauschal verantwortlich machen" },
  { value: "loaded_language", label: "Aufgeladene Sprache", description: "Wertende Begriffe statt sachlicher Beschreibung einsetzen" },
  { value: "fabricated_evidence", label: "Erfundene Belege", description: "Zitate, Zahlen oder Beweise erfinden oder verfälschen" },
  { value: "impersonation", label: "Identität vortäuschen", description: "Eine andere Person oder Quelle imitieren" },
  { value: "out_of_context_media", label: "Bild aus dem Kontext", description: "Bildmaterial ohne entscheidenden Kontext verwenden" },
] as const;

const ALLOWED_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  draft: [{ label: "Zur Prüfung einreichen", next: "in_review" }],
  in_review: [
    { label: "Freigeben", next: "approved" },
    { label: "Ablehnen", next: "rejected" },
    { label: "Zurück zu Entwurf", next: "draft" },
  ],
  approved: [{ label: "Live schalten", next: "live" }],
  live: [{ label: "Archivieren", next: "archived" }],
  rejected: [{ label: "Zurück zu Entwurf", next: "draft" }],
  archived: [{ label: "Zurück zu Entwurf", next: "draft" }],
};

export function ContentDetailDrawer({
  item,
  competencies,
}: {
  item: any;
  competencies: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState(item?.body ?? "");
  const [techniques, setTechniques] = useState<string[]>(item?.manipulation_techniques ?? []);
  const [saved, setSaved] = useState(false);
  const [imageUrl, setImageUrl] = useState(item?.media_url ?? "");
  const [imageInstructions, setImageInstructions] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageNotice, setImageNotice] = useState("");

  async function regenerateImage() {
    setIsRegenerating(true);
    setImageError("");
    setImageNotice("");
    try {
      const response = await fetch(`/api/content/${item.id}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: imageInstructions }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Bild konnte nicht neu generiert werden.");
      setImageUrl(result.mediaUrl);
      setImageInstructions("");
      setImageNotice("Neue Bildversion erstellt und aktiviert. Das vorherige Asset bleibt gespeichert.");
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Bild konnte nicht neu generiert werden.");
    } finally {
      setIsRegenerating(false);
    }
  }

  if (!item) return null;

  const transitions = ALLOWED_TRANSITIONS[item.status] ?? [];

  function save() {
    startTransition(async () => {
      await updateContentItemQuick(item.id, {
        body,
        manipulationTechniques: techniques,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <>
      <a
        href="/content"
        className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
        aria-label="Schließen"
      />
      <aside className="fixed inset-y-0 right-0 z-50 h-screen w-full max-w-lg overflow-y-auto border-l border-border bg-panel shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-border bg-panel/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Content-Detail</p>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900">{item.type}</h2>
              <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-canvas px-2.5 py-1 text-xs font-medium text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {item.status}
              </span>
            </div>
            <a
              href="/content"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-slate-500 transition hover:bg-canvas hover:text-slate-900"
              aria-label="Detail schließen"
            >
              <X className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="space-y-6 p-5">
          {imageUrl && (
            <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Medienvorschau</p>
                  <p className="mt-0.5 text-xs text-slate-500">Verknüpftes Asset</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-slate-600">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Bild
                </span>
              </div>
              <div className="aspect-[4/3] bg-slate-50">
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-slate-500">
                <span className="font-medium">Quelle</span>
                <span className="inline-flex items-center gap-1.5 text-right">
                  {item.extra?.imageProvider === "cloudflare" && (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      FLUX
                    </>
                  )}
                  {item.extra?.imageProvider !== "cloudflare" && (item.extra?.imageProvider ?? "Quelle unbekannt")}
                </span>
              </div>
              <div className="space-y-3 border-t border-border bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Bild neu generieren</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Erstellt eine neue Variante passend zum Post. Um typische KI-Schriftfehler zu vermeiden, soll das Bild keine Schrift, Logos oder Wasserzeichen enthalten. Das bisherige Asset wird nicht überschrieben.</p>
                </div>
                <textarea
                  value={imageInstructions}
                  onChange={(e) => setImageInstructions(e.target.value)}
                  rows={2}
                  placeholder="Optionale Änderungswünsche, z. B. andere Perspektive oder hellere Stimmung"
                  className="w-full resize-y rounded-xl border border-border bg-white px-3 py-2.5 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-violet-500/10"
                />
                <button
                  type="button"
                  onClick={regenerateImage}
                  disabled={isRegenerating}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
                  {isRegenerating ? "Bild wird generiert…" : "Neue Bildversion erzeugen"}
                </button>
                {imageError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{imageError}</p>}
                {imageNotice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-700">{imageNotice}</p>}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Bearbeitung</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">Inhalt bearbeiten</h3>
              <p className="mt-1 text-sm leading-5 text-slate-500">Passe den Inhalt und die zugeordneten Manipulationstechniken an.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Inhalt</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="w-full resize-y rounded-xl border border-border bg-white px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-violet-500/10"
              />
            </div>

            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-xs font-semibold text-slate-700">Manipulationstechniken</legend>
              <p className="mb-3 text-xs leading-5 text-slate-500">Wähle alle Techniken aus, die im Inhalt tatsächlich vorkommen.</p>
              <div className="flex flex-wrap gap-2">
                {MANIPULATION_TECHNIQUES.map((technique) => {
                  const checked = techniques.includes(technique.value);
                  return (
                    <label
                      key={technique.value}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition ${checked ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setTechniques((current) =>
                            e.target.checked
                              ? [...current, technique.value]
                              : current.filter((value) => value !== technique.value)
                          )
                        }
                        className="h-3.5 w-3.5 accent-violet-600"
                      />
                      {technique.label}
                    </label>
                  );
                })}
              </div>
              {techniques.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">{techniques.length} ausgewählt</p>
              )}
            </fieldset>

            <button
              onClick={save}
              disabled={isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Speichert…" : saved ? "Gespeichert ✓" : "Änderungen speichern"}
            </button>
          </section>

          <section className="border-t border-border pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workflow</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">Freigabe</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">Verändere den Status entsprechend dem nächsten Arbeitsschritt.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {transitions.map((t) => (
                <button
                  key={t.next}
                  onClick={() =>
                    startTransition(() => updateContentItemStatusQuick(item.id, item.status, t.next))
                  }
                  className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-accent/40 hover:bg-canvas"
                >
                  {t.label}
                </button>
              ))}
              {transitions.length === 0 && (
                <p className="rounded-xl bg-canvas px-3 py-2 text-xs text-slate-500">Für diesen Status ist keine weitere Aktion definiert.</p>
              )}
            </div>
          </section>

          <section className="border-t border-border pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Herkunft</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">Details</h3>
            <dl className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-xs text-slate-500">Szenario</dt>
                <dd className="max-w-[65%] text-right text-xs font-medium text-slate-700">{item.scenarios?.title ?? "— Ambient —"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-xs text-slate-500">Creator</dt>
                <dd className="max-w-[65%] text-right text-xs font-medium text-slate-700">{item.creators?.display_name ?? "—"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-xs text-slate-500">Erstellt</dt>
                <dd className="text-right text-xs font-medium text-slate-700">{new Date(item.created_at).toLocaleString("de-DE")}</dd>
              </div>
            </dl>
            {item.media_url && (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Bild</span>
                {item.extra?.generatedBy === "ai" && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">KI-generiert</span>}
                {item.extra?.imageProvider === "cloudflare" && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">FLUX</span>}
                {item.extra?.format && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{item.extra.format}</span>}
              </div>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}
