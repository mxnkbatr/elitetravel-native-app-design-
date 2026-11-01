"use client";

import { installmentCancel, installmentPaid, installmentSent } from "@/app/admin/(panel)/actions";
import { PartnerLogo } from "@/components/PartnerLogo";
import { formatPrice } from "@/data/tours";
import { INSTALLMENT_PROVIDERS, type InstallmentRequest } from "@/lib/trips";
import { useState, useTransition } from "react";

/** One open pay-later request: send invoice → mark paid, or cancel. */
export function InstallmentActions({ r, onDone }: { r: InstallmentRequest; onDone?: (paid: boolean) => void }) {
  const [sent, setSent] = useState(r.sent);
  const [closed, setClosed] = useState<"paid" | "cancelled" | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const p = INSTALLMENT_PROVIDERS.find((x) => x.id === r.provider);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after: () => void) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) after();
      else setError(res.error ?? "Алдаа гарлаа.");
    });
  }

  if (closed) return <p className={`text-xs font-semibold ${closed === "paid" ? "text-emerald-700" : "text-muted"}`}>{closed === "paid" ? "✓ Төлөгдсөн гэж бүртгэлээ" : "Цуцаллаа"}</p>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-xs font-bold text-white" style={{ background: p?.color }}>
        <PartnerLogo id={r.provider} size={22} className="rounded-full" />
        {p?.name} · {formatPrice(r.amount)}
      </span>
      {r.phone ? <span className="font-mono text-xs text-muted">{r.phone}</span> : null}
      <span className={`text-xs font-semibold ${sent ? "text-amber-700" : "text-red-600"}`}>{sent ? "Нэхэмжлэх илгээсэн — баталгаажуулалт хүлээж байна" : "Нэхэмжлэх илгээгээгүй"}</span>
      {!sent ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => installmentSent(r.id), () => setSent(true))}
          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          Нэхэмжлэх илгээсэн
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`${p?.name}-ээс ${formatPrice(r.amount)} орж ирсэн үү? Захиалгад төлбөр бүртгэгдэж, аялагчид мэдэгдэл очно.`)) return;
          run(() => installmentPaid(r.id), () => {
            setClosed("paid");
            onDone?.(true);
          });
        }}
        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        Төлөгдсөн
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const reason = window.prompt("Цуцлах шалтгаан (аялагчид харагдана, заавал биш):", "");
          if (reason == null) return;
          run(() => installmentCancel(r.id, reason), () => {
            setClosed("cancelled");
            onDone?.(false);
          });
        }}
        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        Цуцлах
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
