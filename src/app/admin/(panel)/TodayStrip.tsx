"use client";

import { usePulse } from "@/app/admin/(panel)/pulse-context";
import { Icon } from "@/components/Icon";
import Link from "next/link";

/** «Одоо хийх»: everything waiting on staff, each a tap away from the right list. */
export function TodayStrip() {
  const { pulse } = usePulse();
  if (!pulse) return <div className="skeleton mt-5 h-[4.25rem] rounded-2xl" />;

  const items = [
    { n: pulse.unread.length, label: "хариулаагүй чат", href: "/admin?f=unread", tone: "text-red-600" },
    { n: pulse.stale.length, label: "2+ цаг хүлээсэн шинэ хүсэлт", href: "/admin?f=new", tone: "text-amber-700" },
    { n: pulse.documents.length, label: "захиалгад шалгах баримт", href: "/admin?f=docs", tone: "text-sky-800" },
    { n: pulse.installments, label: "хуваан төлөх хүсэлт", href: "/admin/payments", tone: "text-violet-700" },
    { n: pulse.proposals, label: "AI санал зөвшөөрөл хүлээж байна", href: "/admin/agent", tone: "text-emerald-700" },
    { n: pulse.errors, label: "сайтын алдаа (24 цаг)", href: "/admin/errors", tone: "text-red-600" },
  ].filter((i) => i.n > 0);

  return (
    <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white p-3 sm:p-4" aria-label="Одоо хийх">
      <p className="mb-2 px-1 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted">› Одоо хийх</p>
      {items.length === 0 ? (
        <p className="flex items-center gap-1.5 px-1 pb-1 text-sm text-emerald-700">
          <Icon name="badge-check" size={17} /> Хүлээгдэж буй ажил алга. Бүх зүйл цэгцтэй.
        </p>
      ) : (
        <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap">
          {items.map((i) => (
            <Link
              key={i.href + i.label}
              href={i.href}
              className="group flex shrink-0 items-center gap-2.5 rounded-xl border border-[var(--line)] bg-bg px-3 py-2 transition hover:border-accent/60 active:scale-[0.98]"
            >
              <span className={`font-mono text-lg font-semibold leading-none ${i.tone}`}>{i.n}</span>
              <span className="text-sm text-ink">{i.label}</span>
              <span className="text-muted transition group-hover:translate-x-0.5 group-hover:text-accent">→</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
