"use client";

import { Icon } from "@/components/Icon";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/**
 * A page that failed to render: says what happened in plain words, offers to try again, and
 * reports the error to /admin/errors (boundary errors never reach the window error handler).
 */
export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  useEffect(() => {
    const e = error instanceof Error ? error : new Error(String(error));
    const body = JSON.stringify({ message: `boundary: ${e.message}`, stack: e.stack, path: location.pathname, ua: navigator.userAgent });
    void fetch("/api/client-error", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }, [error]);

  return (
    <div className="mx-auto grid min-h-[70dvh] max-w-md place-items-center px-6 pt-[calc(6rem+env(safe-area-inset-top))] text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-[1.4rem] bg-accent-mist text-accent" aria-hidden>
          <Icon name={online ? "alert" : "wifi-off"} size={28} />
        </span>
        <h1 className="type-title mt-5">{online ? "Уучлаарай, энэ хуудас ачаалагдсангүй" : "Интернэт тасарлаа"}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {online
            ? "Манай талд түр алдаа гарлаа. Бид мэдээлэл авсан. Дахин оролдох уу, эсвэл нүүр хуудас руу буцаарай."
            : "Холболтоо шалгаад дахин оролдоно уу. Wi-Fi эсвэл мобайл дата асаалттай эсэхийг харна уу."}
        </p>
        <div className="mt-7 grid gap-2">
          <button type="button" onClick={() => retry()} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-white">
            <Icon name="refresh" size={17} /> Дахин оролдох
          </button>
          <Link href="/" className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--line)] text-sm font-semibold">
            Нүүр хуудас
          </Link>
          <a href="tel:+97690031771" className="mt-1 inline-flex items-center justify-center gap-1.5 text-sm text-muted">
            <Icon name="phone" size={15} /> Тусламж: +976 9003 1771
          </a>
        </div>
      </div>
    </div>
  );
}
