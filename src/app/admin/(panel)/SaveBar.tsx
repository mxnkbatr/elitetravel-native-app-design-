"use client";

import { confirmAction, toast } from "@/app/admin/(panel)/feedback";
import type { SaveResult } from "@/app/admin/(panel)/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/**
 * Sticky footer for the tour / news editors: save (also Ctrl/⌘+S), status, view on site.
 * With unsaved edits it says so, and asks before the page is left.
 */
export function SaveBar({
  kind,
  id,
  originalId,
  dirty = false,
  onSave,
}: {
  kind: "tours" | "news";
  id: string;
  originalId: string | null;
  dirty?: boolean;
  onSave: () => Promise<SaveResult>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const publicHref = kind === "tours" ? `/tours/${originalId}` : "/news";

  function save() {
    if (pending) return;
    setMessage(null);
    start(async () => {
      const res = await onSave();
      if (!res.ok) {
        setMessage({ ok: false, text: res.error });
        toast(res.error, "error");
        return;
      }
      setMessage({ ok: true, text: "Хадгалагдлаа — сайт дээр шинэчлэгдсэн." });
      toast("Хадгалагдлаа — сайт шинэчлэгдсэн");
      if (originalId !== id) router.replace(`/admin/${kind}/${id}`);
      else router.refresh();
    });
  }

  // Keyboard save and the browser's own "leave page?" prompt read the latest values
  const latest = useRef({ save, dirty, leave: (to: string) => router.push(to) });
  useEffect(() => {
    latest.current = { save, dirty, leave: (to: string) => router.push(to) };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        latest.current.save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (latest.current.dirty) e.preventDefault();
    };
    // Any in-app link (back, sidebar, tab bar) asks first while edits are unsaved
    const onLinkClick = (e: globalThis.MouseEvent) => {
      if (!latest.current.dirty || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || a.origin !== location.origin || a.pathname === location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      const to = a.pathname + a.search;
      void confirmAction({ title: "Хадгалаагүй өөрчлөлт байна", body: "Гарвал энэ өөрчлөлтүүд алга болно.", confirm: "Хадгалахгүй гарах", danger: true }).then((ok) => {
        if (ok) latest.current.leave(to);
      });
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    document.addEventListener("click", onLinkClick, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
      document.removeEventListener("click", onLinkClick, true);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--bg-soft)]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:left-[264px]">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
        <Link href={`/admin/${kind}`} className="text-sm font-semibold text-muted hover:text-ink">
          ← Буцах
        </Link>
        {message && !dirty ? (
          <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>
        ) : dirty ? (
          <p className="flex items-center gap-1.5 text-sm text-amber-700">
            <span className="size-2 rounded-full bg-amber-500" /> Хадгалаагүй өөрчлөлт
          </p>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {originalId ? (
            <a href={publicHref} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-accent hover:bg-accent/10">
              Сайт дээр харах ↗
            </a>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            title="Ctrl/⌘ + S"
            className={`h-11 rounded-full px-6 text-sm font-semibold text-white transition disabled:opacity-60 ${dirty ? "bg-accent shadow-[0_10px_24px_rgba(14,143,132,0.3)] hover:bg-accent-soft" : "bg-accent/80 hover:bg-accent"}`}
          >
            {pending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}
