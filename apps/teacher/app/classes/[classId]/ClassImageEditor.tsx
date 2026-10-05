"use client";

import { useRef, useState, useTransition } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

type Props = {
  classId: string;
  imagePath: string | null;
  imageUrl: string | null;
  positionX: number;
  positionY: number;
  zoom: number;
};

export default function ClassImageEditor({
  classId,
  imagePath,
  imageUrl,
  positionX,
  positionY,
  zoom,
}: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

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

      setFile(null);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      setMessage("Gespeichert.");

      startTransition(() => {
        router.refresh();
      });
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

      setX(50);
      setY(50);
      setScale(1);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      setFile(null);
      setMessage("Bild entfernt.");

      startTransition(() => {
        router.refresh();
      });
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
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-slate-100">
        <div className="relative aspect-[16/6]">
          {displayedImage ? (
            <img
              src={displayedImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                objectPosition: `${x}% ${y}%`,
                transform: `scale(${scale})`,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Kein Klassenbild vorhanden
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          disabled={saving || pending}
        >
          {imagePath || previewUrl ? "Bild ändern" : "Bild hinzufügen"}
        </button>

        {(imagePath || previewUrl) && (
          <button
            type="button"
            onClick={removeImage}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            disabled={saving || pending}
          >
            Bild entfernen
          </button>
        )}

        <button
          type="button"
          onClick={save}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          disabled={saving || pending}
        >
          {saving ? "Speichert …" : "Bild speichern"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) =>
          handleFileChange(event.target.files?.[0])
        }
      />

      {(previewUrl || imagePath) && (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Horizontal</span>
            <input
              type="range"
              min="0"
              max="100"
              value={x}
              onChange={(event) => setX(Number(event.target.value))}
              className="w-full"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Vertikal</span>
            <input
              type="range"
              min="0"
              max="100"
              value={y}
              onChange={(event) => setY(Number(event.target.value))}
              className="w-full"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Zoom</span>
            <input
              type="range"
              min="1"
              max="2"
              step="0.05"
              value={scale}
              onChange={(event) => setScale(Number(event.target.value))}
              className="w-full"
            />
          </label>
        </div>
      )}

      {message && (
        <p className="text-sm text-slate-600" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
