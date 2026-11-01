"use client";

import { retryReceipt } from "@/app/admin/(panel)/actions";
import { useTransition } from "react";

export function RetryReceipt({ paymentId }: { paymentId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => void (await retryReceipt(paymentId)))}
      className="rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
    >
      {pending ? "…" : "Дахин илгээх"}
    </button>
  );
}
