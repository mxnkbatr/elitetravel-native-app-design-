"use client";

import type { Pulse } from "@/lib/server/pulse";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type PulseState = { pulse: Pulse | null; syncedAt: number | null; refresh: () => void };

const PulseContext = createContext<PulseState>({ pulse: null, syncedAt: null, refresh: () => {} });

export const usePulse = () => useContext(PulseContext);

/**
 * Polls /api/admin/pulse every 30 s while the tab is visible (and right away when it
 * comes back), and raises a desktop notification when new work arrives.
 */
export function PulseProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<{ pulse: Pulse | null; syncedAt: number | null }>({ pulse: null, syncedAt: null });
  const last = useRef<Pulse | null>(null);
  const busy = useRef(false);

  const tick = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch("/api/admin/pulse", { cache: "no-store" });
      if (!res.ok) return;
      const p = (await res.json()) as Pulse;
      const prev = last.current;
      const grew = prev && (p.newBookings > prev.newBookings || p.unread.length > prev.unread.length || p.installments > prev.installments);
      if (grew && document.hidden && "Notification" in window && Notification.permission === "granted") {
        const installment = p.installments > prev.installments;
        const n = new Notification("Elite Travel", {
          body: installment ? "Хуваан төлөх хүсэлт ирлээ" : p.newBookings > prev.newBookings ? "Шинэ захиалгын хүсэлт ирлээ" : "Аялагч мессеж бичлээ",
          tag: "elite-admin",
        });
        n.onclick = () => {
          window.focus();
          router.push(installment ? "/admin/payments" : "/admin?f=unread");
        };
      }
      last.current = p;
      setState({ pulse: p, syncedAt: Date.now() });
    } catch {
      // Offline for a moment: keep the last numbers
    } finally {
      busy.current = false;
    }
  }, [router]);

  useEffect(() => {
    const first = window.setTimeout(() => void tick(), 0);
    const timer = window.setInterval(() => {
      if (!document.hidden) void tick();
    }, 30_000);
    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tick]);

  useEffect(() => {
    const p = state.pulse;
    const n = p ? p.newBookings + p.unread.length + p.installments : 0;
    document.title = n ? `(${n}) Elite Admin` : "Elite Admin";
  }, [state.pulse]);

  return <PulseContext.Provider value={{ ...state, refresh: () => void tick() }}>{children}</PulseContext.Provider>;
}
