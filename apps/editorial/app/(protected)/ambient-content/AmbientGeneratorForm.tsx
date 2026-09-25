"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import type { AmbientGenerationState, generateAmbientDrafts } from "./actions";

type Action = typeof generateAmbientDrafts;

export function AmbientGeneratorForm({
  action,
  children,
}: {
  action: Action;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState<AmbientGenerationState, FormData>(action, null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state?.ok) {
      setFormKey((key) => key + 1);
    }
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="grid xl:grid-cols-[1.45fr_1fr] gap-5">
      {children}
    </form>
  );
}
