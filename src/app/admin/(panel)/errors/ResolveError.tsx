"use client";

import { resolveError } from "@/app/admin/(panel)/actions";
import { useTransition } from "react";

export function ResolveError({ message }: { message: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => void (await resolveError(message)))}
      className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-white disabled:opacity-50"
    >
      {pending ? "…" : "Шийдсэн"}
    </button>
  );
}
