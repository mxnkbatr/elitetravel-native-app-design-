"use client";

import { confirmAction, toast } from "@/app/admin/(panel)/feedback";
import { deleteItem, reorder } from "@/app/admin/(panel)/actions";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

export type ListItem = { id: string; title: string; sub: string; image: string; badge?: string; muted?: boolean };

/** Tours / news overview: reorder with arrows (order shown on the site), edit, delete. */
export function ContentList({ table, items: initial }: { table: "tours" | "news"; items: ListItem[] }) {
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    const before = items;
    setItems(next);
    setError(null);
    start(async () => {
      const res = await reorder(table, next.map((i) => i.id));
      if (!res.ok) {
        setItems(before);
        setError(res.error);
        toast(res.error, "error");
      } else toast("Дараалал хадгалагдлаа");
    });
  }

  async function remove(item: ListItem) {
    if (!(await confirmAction({ title: `«${item.title}» устгах уу?`, body: "Сайтаас шууд алга болно. Буцаах боломжгүй.", confirm: "Устгах", danger: true }))) return;
    const before = items;
    setItems(items.filter((i) => i.id !== item.id));
    start(async () => {
      const res = await deleteItem(table, item.id);
      if (!res.ok) {
        setItems(before);
        setError(res.error);
        toast(res.error, "error");
      } else toast(`«${item.title}» устгагдлаа`);
    });
  }

  return (
    <div className="mt-6 space-y-2">
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {items.map((item, i) => (
        <div key={item.id} className={`flex items-center gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white p-2 pr-2.5 sm:p-2.5 sm:pr-3 ${item.muted ? "opacity-60" : ""}`}>
          <div className="flex flex-col">
            <button type="button" aria-label="Дээш" disabled={pending || i === 0} onClick={() => move(i, i - 1)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-bg disabled:opacity-25">
              ▲
            </button>
            <button type="button" aria-label="Доош" disabled={pending || i === items.length - 1} onClick={() => move(i, i + 1)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-bg disabled:opacity-25">
              ▼
            </button>
          </div>
          <Link href={`/admin/${table}/${item.id}`} className="flex min-w-0 flex-1 items-center gap-3 active:opacity-70">
            <div className="relative aspect-square w-14 shrink-0 overflow-hidden rounded-xl bg-bg sm:aspect-[4/3] sm:w-20">
              {item.image ? <Image src={item.image} alt="" fill sizes="80px" className="object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{item.title}</p>
              <p className="truncate text-xs text-muted">{item.sub}</p>
              {item.badge ? <span className="mt-1 inline-block rounded-full bg-bg px-2 py-0.5 text-[0.65rem] font-semibold text-muted sm:hidden">{item.badge}</span> : null}
            </div>
          </Link>
          {item.badge ? <span className="hidden rounded-full bg-bg px-2.5 py-1 text-[0.7rem] font-semibold text-muted sm:inline">{item.badge}</span> : null}
          <Link href={`/admin/${table}/${item.id}`} className="hidden rounded-full px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/10 sm:inline">
            Засах
          </Link>
          <button type="button" aria-label="Устгах" onClick={() => remove(item)} disabled={pending} className="grid size-9 place-items-center rounded-full text-red-600 hover:bg-red-50">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
