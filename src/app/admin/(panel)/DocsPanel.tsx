"use client";

import { Icon } from "@/components/Icon";
import { adminDocuments, reviewDoc, type AdminDocs } from "@/app/admin/(panel)/actions";
import { DOC_STATUS_LABEL, docInfo } from "@/lib/documents";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

const TONE = { pending: "bg-amber-100 text-amber-800", approved: "bg-emerald-100 text-emerald-800", rejected: "bg-red-100 text-red-700" } as const;

/** Uploaded documents, care form and contract status of one booking, with approve / reject. */
export function DocsPanel({ bookingId }: { bookingId: string }) {
  const [data, setData] = useState<AdminDocs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const load = useCallback(() => {
    adminDocuments(bookingId)
      .then(setData)
      .catch(() => setError("Ачаалж чадсангүй."));
  }, [bookingId]);

  useEffect(load, [load]);

  function review(id: number, status: "approved" | "rejected") {
    start(async () => {
      const res = await reviewDoc(id, status, status === "rejected" ? note : "");
      if (!res.ok) return setError(res.error);
      setRejecting(null);
      setNote("");
      load();
    });
  }

  if (error) return <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!data) return <p className="rounded-2xl bg-bg p-6 text-center text-sm text-muted">Ачаалж байна…</p>;

  const uploaded = data.slots.filter((s) => s.id).length;
  return (
    <div className="space-y-4 pb-2">
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Бичиг баримт · {uploaded}/{data.slots.length}
        </p>
        {data.slots.length === 0 ? <p className="rounded-2xl bg-bg p-4 text-sm text-muted">Энэ аялалд баримт шаардаагүй. «Аялал» хэсгээс тохируулна.</p> : null}
        <div className="space-y-2">
          {data.slots.map((s) => (
            <div key={`${s.type}-${s.slot}`} className="rounded-2xl border border-[var(--line)] bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">
                  {docInfo(s.type)?.label}
                  {s.label ? <span className="font-normal text-muted"> · {s.label}</span> : null}
                </p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${s.status ? TONE[s.status] : "bg-zinc-100 text-zinc-500"}`}>
                  {s.status ? DOC_STATUS_LABEL[s.status] : "Ирээгүй"}
                </span>
              </div>
              {s.check && s.check.ok === false ? <p className="mt-1 text-[0.7rem] text-amber-700">Автомат шалгалт: шаардлага хангаагүй байж магадгүй</p> : null}
              {s.note ? <p className="mt-1 text-[0.7rem] text-muted">Тэмдэглэл: {s.note}</p> : null}
              {s.id ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <a href={`/admin/documents/${s.id}`} target="_blank" rel="noreferrer" className="rounded-full bg-bg px-3 py-1.5 text-xs font-semibold text-accent">
                    Нээх {s.mime === "application/pdf" ? "(PDF)" : ""}
                  </a>
                  {s.status !== "approved" ? (
                    <button type="button" disabled={pending} onClick={() => review(s.id!, "approved")} className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                      Зөвшөөрөх
                    </button>
                  ) : null}
                  {s.status !== "rejected" ? (
                    <button type="button" disabled={pending} onClick={() => setRejecting(rejecting === s.id ? null : s.id)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600">
                      Дахин илгээх
                    </button>
                  ) : null}
                </div>
              ) : null}
              {rejecting === s.id ? (
                <div className="mt-2 flex gap-2">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    placeholder="Шалтгаан (аялагчид харагдана)"
                    className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--line)] px-3 text-sm outline-none focus:border-accent"
                  />
                  <button type="button" disabled={pending || !note.trim()} onClick={() => review(s.id!, "rejected")} className="rounded-xl bg-red-600 px-3 text-xs font-semibold text-white disabled:opacity-50">
                    Илгээх
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-3">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Нэмэлт мэдээлэл</p>
        {data.care ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted">Яаралтай</dt>
            <dd className="font-semibold">
              {data.care.emergencyName} · <a href={`tel:${data.care.emergencyPhone}`} className="text-accent">{data.care.emergencyPhone}</a>
              {data.care.emergencyRelation ? <span className="font-normal text-muted"> ({data.care.emergencyRelation})</span> : null}
            </dd>
            {data.care.diet ? (
              <>
                <dt className="text-muted">Хоол</dt>
                <dd>{data.care.diet}</dd>
              </>
            ) : null}
            {data.care.medical ? (
              <>
                <dt className="text-muted">Эрүүл мэнд</dt>
                <dd>{data.care.medical}</dd>
              </>
            ) : null}
            {data.care.mobility ? (
              <>
                <dt className="text-muted">Хөдөлгөөн</dt>
                <dd>{data.care.mobility}</dd>
              </>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-muted">Бөглөөгүй.</p>
        )}
      </section>

      <section className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white p-3 text-sm">
        <span>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Гэрээ</span>
          {data.contract ? `✓ ${data.contract.name} · ${new Date(data.contract.signedAt).toLocaleDateString("mn-MN")}` : "Гарын үсэг зураагүй"}
        </span>
        {data.contract ? (
          <Link href={`/admin/contracts/${bookingId}`} target="_blank" className="shrink-0 rounded-full bg-bg px-3 py-1.5 text-xs font-semibold text-accent">
            Харах / хэвлэх
          </Link>
        ) : null}
      </section>
      <p className="text-center text-[0.7rem] text-muted"><Icon name="lock" size={14} className="mr-1.5 inline -mt-0.5 text-muted" />Файл болон эрүүл мэндийн мэдээлэл нээх бүр бүртгэгдэнэ.</p>
    </div>
  );
}
