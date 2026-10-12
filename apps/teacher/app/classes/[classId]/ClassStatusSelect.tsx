"use client";

import { useTransition } from "react";
import { updateClassStatus } from "../actions";

type Status = "active" | "paused" | "ended";

type Props = {
  classId: string;
  status: Status;
};

export function ClassStatusSelect({ classId, status }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(() => {
          void updateClassStatus(classId, formData);
        });
      }}
    >
      <label htmlFor="class-status" className="sr-only">
        Klassenstatus
      </label>

      <select
        id="class-status"
        name="status"
        defaultValue={status}
        disabled={pending}
        onChange={(event) => {
          event.currentTarget.form?.requestSubmit();
        }}
        className="rounded-xl border border-white/15 bg-slate-950/65 px-3 py-2 text-xs font-medium text-white outline-none backdrop-blur disabled:opacity-60"
      >
        <option value="active">Aktiv</option>
        <option value="paused">Pausiert</option>
        <option value="ended">Beendet</option>
      </select>
    </form>
  );
}
