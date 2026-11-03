"use client";

import { TodayStrip } from "@/app/admin/(panel)/TodayStrip";
import type { ChatThread } from "@/lib/server/agent/chats";
import Link from "next/link";

export type DeskContext = { kind: "bookings" } | { kind: "chats"; threads: ChatThread[] } | { kind: "site" } | { kind: "boost"; metaReady: boolean };

function ago(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `${min} мин`;
  if (min < 48 * 60) return `${Math.round(min / 60)} цаг`;
  return `${Math.round(min / 1440)} өдөр`;
}

/** What the desk is looking at, shown above an empty chat. `send` hands a task to the agent. */
export function DeskIntro({ context, send }: { context: DeskContext; send: (text: string) => void }) {
  switch (context.kind) {
    case "bookings":
      return <TodayStrip />;
    case "chats":
      return <ChatInbox threads={context.threads} send={send} />;
    case "boost":
      return <MetaStatus ready={context.metaReady} />;
    case "site":
      return null;
  }
}

function ChatInbox({ threads, send }: { threads: ChatThread[]; send: (text: string) => void }) {
  const open = threads.filter((t) => t.unanswered).length;
  return (
    <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white" aria-label="Ирсэн чатууд">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3.5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted">Ирсэн чатууд · 30 хоног</p>
        {open ? (
          <button type="button" onClick={() => send("Хариулаагүй бүх чатыг уншаад, тус бүрт хариу бэлд")} className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white">
            {open} хариулаагүй — AI хариу бэлдэх
          </button>
        ) : null}
      </div>
      {threads.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted">Сүүлийн 30 хоногт аялагчдаас чат ирээгүй.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {threads.map((t) => (
            <li key={t.bookingId} className="flex items-start gap-3 px-4 py-3">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${t.unread ? "bg-red-500" : t.unanswered ? "bg-amber-500" : "bg-black/10"}`} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2 text-sm">
                  <span className="font-semibold text-ink">{t.name || "Аялагч"}</span>
                  <span className="truncate text-xs text-muted">{t.tour}</span>
                  <span className="ml-auto shrink-0 text-[0.7rem] text-muted" suppressHydrationWarning>
                    {ago(t.lastAt)}
                  </span>
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-ink/80">
                  {t.lastFrom === "staff" ? <span className="text-muted">Та: </span> : t.lastFrom === "system" ? <span className="text-muted">Систем: </span> : null}
                  {t.lastText}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.unanswered ? (
                    <button type="button" onClick={() => send(`${t.bookingId} захиалгын чатыг уншаад хариу бэлд`)} className="rounded-full border border-accent/40 px-3 py-1 text-xs font-semibold text-accent hover:bg-accent hover:text-white">
                      AI хариу
                    </button>
                  ) : null}
                  <button type="button" onClick={() => send(`${t.bookingId} захиалгын чатыг хураангуйлж, дараа нь юу хийхийг хэл`)} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-ink hover:border-accent/50">
                    Хураангуй
                  </button>
                  <Link href={`/admin?q=${t.bookingId}`} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold text-muted hover:text-ink">
                    Чат нээх · {t.bookingId}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MetaStatus({ ready }: { ready: boolean }) {
  if (ready) {
    return <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Meta (Facebook, Instagram) сурталчилгааны бүртгэл холбогдсон.</p>;
  }
  return (
    <section className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
      <p className="font-semibold">Meta хараахан холбогдоогүй</p>
      <p className="mt-1">
        Одоогоор AI нь аль постыг, хэнд, ямар төсвөөр хүргэхийг төлөвлөж, текст бэлдэнэ. Boost-ыг өөрөө ажиллуулахын тулд Meta Business Manager, төлбөрийн карттай Ad account үүсгээд
        сервер дээр <code className="font-mono text-xs">META_ACCESS_TOKEN</code>, <code className="font-mono text-xs">META_AD_ACCOUNT_ID</code>, <code className="font-mono text-xs">META_PAGE_ID</code>{" "}
        тохируулна.
      </p>
    </section>
  );
}
