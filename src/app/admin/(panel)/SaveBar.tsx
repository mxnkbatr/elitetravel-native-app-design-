"use client";

import type { SaveResult } from "@/app/admin/(panel)/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Sticky footer for the tour / news editors: save, status message, view on site. */
export function SaveBar({
  kind,
  id,
  originalId,
  onSave,
}: {
  kind: "tours" | "news";
  id: string;
  originalId: string | null;
  onSave: () => Promise<SaveResult>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const publicHref = kind === "tours" ? `/tours/${originalId}` : "/news";

  function save() {
    setMessage(null);
    start(async () => {
      const res = await onSave();
      if (!res.ok) {
        setMessage({ ok: false, text: res.error });
        return;
      }
      setMessage({ ok: true, text: "Хадгалагдлаа — сайт дээр шинэчлэгдсэн." });
      if (originalId !== id) router.replace(`/admin/${kind}/${id}`);
      else router.refresh();
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--bg-soft)]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:left-[256px]">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
        <Link href={`/admin/${kind}`} className="text-sm font-semibold text-muted hover:text-ink">
          ← Буцах
        </Link>
        {message ? <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p> : null}
        <div className="ml-auto flex items-center gap-2">
          {originalId ? (
            <a href={publicHref} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-accent hover:bg-accent/10">
              Сайт дээр харах ↗
            </a>
          ) : null}
          <button type="button" onClick={save} disabled={pending} className="h-11 rounded-full bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60">
            {pending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}
