"use client";

import { saveContractTemplate } from "@/app/admin/(panel)/actions";
import { PLACEHOLDERS, renderContract, unfilledParts, type ContractTemplate } from "@/lib/contract";
import { useMemo, useState, useTransition } from "react";

const SAMPLE = {
  booking_id: "ET-ABCD2345",
  name: "Бат-Эрдэнэ",
  phone: "9911 2233",
  tour: "Бали, Индонез",
  dates: "11/20 – 11/28",
  travellers: "2",
  total: "₮11'580'000",
  deposit: "₮5'790'000",
  today: new Intl.DateTimeFormat("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
};

export function ContractEditor({ initial }: { initial: ContractTemplate }) {
  const [body, setBody] = useState(initial.body);
  const [published, setPublished] = useState(initial.published);
  const [version, setVersion] = useState(initial.version);
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const open = useMemo(() => unfilledParts(body), [body]);

  function save(publish: boolean) {
    setMessage(null);
    start(async () => {
      const res = await saveContractTemplate(body, publish);
      if (!res.ok) return setMessage({ ok: false, text: res.error });
      setPublished(publish);
      if (res.version) setVersion(res.version);
      setMessage({ ok: true, text: publish ? "Нийтлэгдлээ — аялагчид одоо харагдана." : "Хадгалагдлаа (нийтлээгүй)." });
    });
  }

  return (
    <div className="mt-5 space-y-4">
      <div className={`rounded-[1.25rem] px-4 py-3 text-sm ${published ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
        {published ? `✓ Нийтлэгдсэн · хувилбар ${version}` : "Нийтлээгүй — аялагчид харагдахгүй байна."}
        {!published ? (
          <span className="mt-1 block text-xs">Загвар нь зөвхөн эхлэл. Хуульчаар хянуулж, [ ] доторх хэсгүүдийг бөглөсний дараа нийтэлнэ үү.</span>
        ) : null}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setPreview(false)} className={`rounded-full px-4 py-2 text-sm font-semibold ${!preview ? "bg-accent text-white" : "bg-white"}`}>
          Засах
        </button>
        <button type="button" onClick={() => setPreview(true)} className={`rounded-full px-4 py-2 text-sm font-semibold ${preview ? "bg-accent text-white" : "bg-white"}`}>
          Урьдчилж харах
        </button>
      </div>

      {preview ? (
        <pre className="whitespace-pre-wrap rounded-[1.4rem] border border-[var(--line)] bg-white p-5 font-sans text-sm leading-relaxed">{renderContract(body, SAMPLE)}</pre>
      ) : (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={24}
          className="w-full rounded-[1.4rem] border border-[var(--line)] bg-white p-4 font-mono text-[0.8rem] leading-relaxed outline-none focus:border-accent"
        />
      )}

      <div className="rounded-[1.25rem] border border-[var(--line)] bg-white p-4">
        <p className="text-xs font-semibold text-muted">Автоматаар бөглөгдөх талбарууд</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <code key={p.key} className="rounded-lg bg-bg px-2 py-1 text-[0.7rem]" title={p.label}>
              {`{{${p.key}}}`} <span className="font-sans text-muted">{p.label}</span>
            </code>
          ))}
        </div>
      </div>

      {open.length ? <p className="text-xs text-amber-700">Бөглөөгүй хэсэг: {open.slice(0, 4).join(" · ")}</p> : null}
      {message ? <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => save(false)} className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-ink disabled:opacity-50">
          {published ? "Нийтлэлтээс буулгаж хадгалах" : "Хадгалах"}
        </button>
        <button type="button" disabled={pending || open.length > 0} onClick={() => save(true)} className="h-11 rounded-full bg-accent px-6 text-sm font-semibold text-white disabled:opacity-50">
          {published ? "Шинэчилж нийтлэх" : "Нийтлэх"}
        </button>
      </div>
    </div>
  );
}
