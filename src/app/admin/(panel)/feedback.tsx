"use client";

import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { haptic } from "@/lib/native";
import { AnimatePresence, motion } from "framer-motion";
import { useSyncExternalStore } from "react";

/**
 * Staff feedback without browser dialogs: `confirmAction()` opens a bottom sheet (dialog on
 * desktop) and resolves true/false; `toast()` shows a short note that clears itself.
 * One <FeedbackHost /> in the admin shell renders both.
 */

type Confirm = { title: string; body?: string; confirm: string; danger?: boolean; resolve: (ok: boolean) => void };
type Toast = { id: number; text: string; tone: "ok" | "error" | "info" };

let pending: Confirm | null = null;
let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export function confirmAction(opts: { title: string; body?: string; confirm?: string; danger?: boolean }): Promise<boolean> {
  pending?.resolve(false);
  return new Promise((resolve) => {
    pending = { confirm: "Тийм", ...opts, resolve };
    emit();
  });
}

export function toast(text: string, tone: Toast["tone"] = "ok") {
  const id = ++seq;
  toasts = [...toasts.slice(-2), { id, text, tone }];
  emit();
  if (tone === "ok") haptic("success");
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, tone === "error" ? 6000 : 3200);
}

function answer(ok: boolean) {
  const p = pending;
  pending = null;
  emit();
  p?.resolve(ok);
}

const TONE: Record<Toast["tone"], { cls: string; icon: "check" | "alert" | "info" }> = {
  ok: { cls: "bg-[#062a2a] text-white", icon: "check" },
  error: { cls: "bg-[#b42318] text-white", icon: "alert" },
  info: { cls: "bg-white text-ink border border-[var(--line)]", icon: "info" },
};

export function FeedbackHost() {
  const confirm = useSyncExternalStore(subscribe, () => pending, () => null);
  const list = useSyncExternalStore(subscribe, () => toasts, () => toasts);

  return (
    <>
      <Sheet open={confirm != null} onClose={() => answer(false)} label={confirm?.title ?? "Баталгаажуулах"}>
        {confirm ? (
          <div className="pb-1 pt-3 text-center">
            <span className={`mx-auto grid size-12 place-items-center rounded-2xl ${confirm.danger ? "bg-red-50 text-red-600" : "bg-accent/10 text-accent"}`} aria-hidden>
              <Icon name={confirm.danger ? "alert" : "info"} size={22} />
            </span>
            <p className="mt-3 font-display text-xl font-semibold text-ink">{confirm.title}</p>
            {confirm.body ? <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{confirm.body}</p> : null}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => answer(false)} className="h-12 rounded-xl border border-[var(--line)] text-sm font-semibold text-ink">
                Болих
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => answer(true)}
                className={`h-12 rounded-xl text-sm font-semibold text-white ${confirm.danger ? "bg-[#c2410c]" : "bg-accent"}`}
              >
                {confirm.confirm}
              </button>
            </div>
          </div>
        ) : null}
      </Sheet>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[110] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-[264px]"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {list.map((t) => (
            <motion.p
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={`flex max-w-md items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-[0_14px_34px_rgba(0,0,0,0.22)] ${TONE[t.tone].cls}`}
            >
              <Icon name={TONE[t.tone].icon} size={16} strokeWidth={2.2} />
              {t.text}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
