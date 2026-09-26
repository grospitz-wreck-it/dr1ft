"use client";

import type { ReactNode } from "react";
import type { generateAmbientDrafts } from "./actions";

type Action = typeof generateAmbientDrafts;

// Form intentionally uses a plain Server Action: successful generation redirects and remounts the page, resetting all fields.
export function AmbientGeneratorForm({
  action,
  children,
}: {
  action: Action;
  children: ReactNode;
}) {
  return (
    <form action={action} className="grid xl:grid-cols-[1.45fr_1fr] gap-5">
      {children}
    </form>
  );
}
