"use client";

import { saveProvider } from "@/app/admin/(panel)/actions";
import { PartnerLogo } from "@/components/PartnerLogo";
import type { InstallmentProvider } from "@/lib/trips";
import { useState, useTransition } from "react";

const toNum = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[^\d]/g, "")));

export function ProviderSettings({ p }: { p: InstallmentProvider & { enabled: boolean } }) {
  const [enabled, setEnabled] = useState(p.enabled);
  const [min, setMin] = useState(p.min == null ? "" : String(p.min));
  const [max, setMax] = useState(p.max == null ? "" : String(p.max));
  const [terms, setTerms] = useState(p.terms ?? "");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function save(nextEnabled = enabled) {
    setMessage(null);
    start(async () => {
      const res = await saveProvider(p.id, { enabled: nextEnabled, min: toNum(min), max: toNum(max), terms });
      setMessage(res.ok ? { ok: true, text: "✓" } : { ok: false, text: res.error });
    });
  }

  const input = "h-9 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-accent";
  return (
    <div className={`rounded-2xl border border-[var(--line)] bg-white p-4 ${enabled ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-3">
        <PartnerLogo id={p.id} />
        <p className="font-semibold">{p.name}</p>
        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-muted">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked);
              save(e.target.checked);
            }}
            className="size-4 accent-[#0d8f84]"
          />
          Идэвхтэй
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-[0.7rem] font-semibold text-muted">
          Доод дүн (₮)
          <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} placeholder="Хязгааргүй" className={`mt-1 ${input}`} />
        </label>
        <label className="text-[0.7rem] font-semibold text-muted">
          Дээд дүн (₮)
          <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Хязгааргүй" className={`mt-1 ${input}`} />
        </label>
        <label className="col-span-2 text-[0.7rem] font-semibold text-muted">
          Нөхцөл (аялагчид харагдана)
          <input value={terms} onChange={(e) => setTerms(e.target.value)} maxLength={200} placeholder="Жишээ: 4 хуваан, хүүгүй" className={`mt-1 ${input}`} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" disabled={pending} onClick={() => save()} className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
          Хадгалах
        </button>
        {message ? <span className={`text-xs ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</span> : null}
      </div>
    </div>
  );
}
