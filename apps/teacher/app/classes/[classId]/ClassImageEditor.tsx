"use client";

import { useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

type Props = {
  classId: string;
  imagePath: string | null;
  imageUrl: string | null;
  positionX: number;
  positionY: number;
  zoom: number;
  onClose: () => void;
};

export default function ClassImageEditor({
  classId,
  imagePath,
  imageUrl,
  positionX,
  positionY,
  zoom,
  onClose,
}: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [x, setX] = useState(positionX);
  const [y, setY] = useState(positionY);
  const [scale, setScale] = useState(zoom);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const displayedImage = previewUrl ?? imageUrl;

  function handleFileChange(selected: File | undefined) {
    if (!selected) return;

    setMessage(null);

    if (!selected.type.startsWith("image/")) {
      setMessage("Bitte eine Bilddatei auswählen.");
      return;
    }

    if (selected.size > 8 * 1024 * 1024) {
      setMessage("Das Bild darf maximal 8 MB groß sein.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function save() {
    setSaving(true);
    setMessage(null);

    try {
      let nextPath = imagePath;

      if (file) {
        const extension =
          file.name.split(".").pop()?.toLowerCase() || "jpg";

        const path = `${classId}/class-${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("class-images")
          .upload(path, file, {
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        nextPath = path;
      }

      const { error: updateError } = await supabase
        .from("class_instances")
        .update({
          class_image_path: nextPath,
          class_image_position_x: x,
          class_image_position_y: y,
          class_image_zoom: scale,
        })
        .eq("id", classId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (file && imagePath && imagePath !== nextPath) {
        await supabase.storage
          .from("class-images")
          .remove([imagePath]);
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setFile(null);
      setPreviewUrl(null);
      onClose();
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Das Bild konnte nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeImage() {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("class_instances")
        .update({
          class_image_path: null,
          class_image_position_x: 50,
          class_image_position_y: 50,
          class_image_zoom: 1,
        })
        .eq("id", classId);

      if (error) {
        throw new Error(error.message);
      }

      if (imagePath) {
        await supabase.storage
          .from("class-images")
          .remove([imagePath]);
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setX(50);
      setY(50);
      setScale(1);
      setFile(null);
      setPreviewUrl(null);

      onClose();
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Das Bild konnte nicht entfernt werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
      <div className="flex flex-col gap-4 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Klassenbild
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">
            Bildausschnitt anpassen
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Position und Zoom bestimmen, welcher Ausschnitt im Klassen-Header angezeigt wird.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-canvas">
            Bild ändern
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={saving}
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) handleFileChange(selected);
                event.currentTarget.value = "";
              }}
            />
          </label>

          {imagePath && (
            <button
              type="button"
              onClick={() => void removeImage()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              Bild entfernen
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1.5fr_.75fr]">
        {displayedImage ? (
          <div className="overflow-hidden rounded-2xl bg-slate-950">
            <div className="relative aspect-[16/6] min-h-[220px] overflow-hidden">
              <img
                src={displayedImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  objectPosition: `${x}% ${y}%`,
                  transform: `scale(${scale})`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
              <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs font-medium text-white backdrop-blur">
                Vorschau des Klassen-Headers
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border bg-canvas p-8 text-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Noch kein Klassenbild
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Wähle rechts ein Bild aus, um den Header zu gestalten.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Horizontal</label>
              <span className="text-xs font-mono text-slate-400">{x}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={x}
              onChange={(event) => setX(Number(event.target.value))}
              className="mt-3 w-full accent-indigo-600"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>Links</span>
              <span>Rechts</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Vertikal</label>
              <span className="text-xs font-mono text-slate-400">{y}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={y}
              onChange={(event) => setY(Number(event.target.value))}
              className="mt-3 w-full accent-indigo-600"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>Oben</span>
              <span>Unten</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Zoom</label>
              <span className="text-xs font-mono text-slate-400">{scale.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={scale}
              onChange={(event) => setScale(Number(event.target.value))}
              className="mt-3 w-full accent-indigo-600"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>100 %</span>
              <span>250 %</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => {
                setX(50);
                setY(50);
                setScale(1);
              }}
              className="rounded-xl border border-border px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-canvas"
            >
              Zurücksetzen
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-border px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-canvas disabled:opacity-50"
            >
              Schließen
            </button>

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Speichert…" : "Bildausschnitt speichern"}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className="border-t border-border px-6 py-4 text-sm text-red-600">
          {message}
        </div>
      )}
    </section>
  );
}
