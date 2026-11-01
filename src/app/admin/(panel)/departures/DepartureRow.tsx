"use client";

import { saveDeparture } from "@/app/admin/(panel)/actions";
import Link from "next/link";
import { useState, useTransition } from "react";

export type DepartureStats = {
  tourId: string;
  label: string;
  capacity: number | null;
  closed: boolean;
  /** People holding seats: new, contacted, confirmed, paid */
  held: number;
  /** Confirmed + paid people */
  booked: number;
  pending: number;
  waitlist: number;
  passportsReady: number;
  collected: number;
};

export function DepartureRow({ s }: { s: DepartureStats }) {
  const [capacity, setCapacity] = useState(s.capacity == null ? "" : String(s.capacity));
  const [closed, setClosed] = useState(s.closed);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const cap = capacity.trim() === "" ? null : Number(capacity.replace(/[^\d]/g, ""));
  const fill = cap ? Math.min(100, (s.held / cap) * 100) : 0;
  const over = cap != null && s.held > cap;
  const detail = `/admin/departures/${s.tourId}?date=${encodeURIComponent(s.label)}`;

  function save(nextClosed = closed) {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await saveDeparture(s.tourId, s.label, cap, nextClosed);
      if (res.ok) setSaved(true);
      else setError(res.error);
    });
  }

  return (
    <div className={`grid items-center gap-3 rounded-xl bg-[#f8faf9] p-2.5 lg:grid-cols-[minmax(9rem,1.2fr)_6rem_1fr_repeat(3,5.5rem)_auto] ${closed ? "opacity-60" : ""}`}>
      <Link href={detail} className="font-semibold hover:text-accent">
        {s.label || "Огноогүй"}
      </Link>
      <input
        inputMode="numeric"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        onBlur={() => cap !== s.capacity && save()}
        placeholder="—"
        aria-label="Суудлын тоо"
        className="h-9 w-24 rounded-lg border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-accent"
      />
      <div>
        <div className="flex justify-between text-xs">
          <span className={over ? "font-semibold text-red-600" : "text-muted"}>
            {s.held}
            {cap != null ? ` / ${cap}` : ""} хүн
          </span>
          <span className="text-muted">{s.booked} баталгаажсан</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
          <div className={`h-full rounded-full ${over ? "bg-red-500" : fill >= 90 ? "bg-amber-500" : "bg-accent"}`} style={{ width: `${cap ? fill : 0}%` }} />
        </div>
      </div>
      <span className="text-sm">
        <span className="text-xs text-muted lg:hidden">Хүлээгдэж: </span>
        {s.pending}
      </span>
      <span className={`text-sm ${s.waitlist ? "font-semibold text-violet-700" : ""}`}>
        <span className="text-xs text-muted lg:hidden">Хүлээлэг: </span>
        {s.waitlist}
      </span>
      <span className={`text-sm ${s.booked && s.passportsReady < s.booked ? "font-semibold text-red-600" : ""}`}>
        <span className="text-xs text-muted lg:hidden">Паспорт: </span>
        {s.passportsReady}/{s.booked}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setClosed(!closed);
            save(!closed);
          }}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${closed ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"}`}
        >
          {closed ? "Нээх" : "Хаах"}
        </button>
        <Link href={detail} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10">
          Жагсаалт →
        </Link>
        {pending ? <span className="text-[0.7rem] text-muted">…</span> : saved ? <span className="text-[0.7rem] text-emerald-700">✓</span> : null}
        {error ? <span className="text-[0.7rem] text-red-600">{error}</span> : null}
      </div>
    </div>
  );
}
