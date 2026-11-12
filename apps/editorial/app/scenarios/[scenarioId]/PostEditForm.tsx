"use client";

import { useState, useTransition, type FormEvent } from "react";

type PostEditFormProps = {
  title: string | null;
  body: string;
  action: (formData: FormData) => Promise<void>;
};

export function PostEditForm({ title, body, action }: PostEditFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError("");
    startTransition(async () => {
      try {
        await action(formData);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); setError(""); }}
        aria-expanded={open}
        className="cursor-pointer text-xs font-semibold text-accent hover:underline"
      >
        {open ? "Bearbeitung schließen" : "Beitrag bearbeiten"}
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="block text-[11px] font-medium text-slate-500">Titel (optional)
            <input name="title" defaultValue={title ?? ""} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="block text-[11px] font-medium text-slate-500">Beitragstext
            <textarea name="body" required defaultValue={body} rows={5} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" />
          </label>
          {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={isPending} onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">Abbrechen</button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50">
              {isPending ? "Speichert …" : "Änderungen speichern"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
