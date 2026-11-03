"use client";

import { confirmAction } from "@/app/admin/(panel)/feedback";
import { broadcast } from "@/app/admin/(panel)/actions";
import { useState, useTransition } from "react";

const TEMPLATES = [
  "Нислэгийн цаг өөрчлөгдлөө: ",
  "Онгоцны буудал дээр уулзах цэг, цаг: ",
  "Авч явах зүйлс: паспорт, валют, цэнэглэгч, нарны тос, усны хувцас.",
];

/** Sends one message to every live booking on this departure. */
export function Broadcast({ tourId, label, recipients }: { tourId: string; label: string; recipients: number }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    if (!text.trim() || !(await confirmAction({ title: `${recipients} захиалагчид илгээх үү?`, body: "Мессеж аялагч бүрийн аппад болон чатад очно.", confirm: "Илгээх" }))) return;
    setMessage(null);
    start(async () => {
      const res = await broadcast(tourId, label, text);
      if (res.ok) {
        setText("");
        setMessage({ ok: true, text: `${res.sent} захиалагчийн аппад илгээгдлээ.` });
      } else setMessage({ ok: false, text: res.error });
    });
  }

  return (
    <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
      <h2 className="font-display text-xl font-semibold">Бүх зорчигчид мэдэгдэл</h2>
      <p className="mt-0.5 text-xs text-muted">Энэ огнооны {recipients} захиалагчийн аппын чатад очно (цуцалснаас бусад).</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {TEMPLATES.map((t) => (
          <button key={t} type="button" onClick={() => setText(t)} className="rounded-full bg-[#f3f6f5] px-3 py-1 text-xs text-muted hover:text-ink">
            {t.length > 40 ? `${t.slice(0, 40)}…` : t}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Жишээ: Нислэг 22:10-оос 23:40 болж хойшиллоо. Буудал дээр 21:00-д уулзана."
        className="mt-3 w-full rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-accent"
      />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" disabled={pending || !text.trim() || !recipients} onClick={send} className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent disabled:opacity-50">
          {pending ? "Илгээж байна…" : "Илгээх"}
        </button>
        {message ? <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p> : null}
      </div>
    </section>
  );
}
