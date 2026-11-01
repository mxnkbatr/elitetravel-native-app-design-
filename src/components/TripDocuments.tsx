"use client";

import { DOC_STATUS_LABEL, docInfo, type Care, type DocType } from "@/lib/documents";
import type { Trip, TripDocSlot } from "@/lib/trips";
import { checkVisaPhoto, compressForUpload, type PhotoReport } from "@/lib/visa-photo";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type CareAction = { action: "care"; care: Care };
export type SignAction = { action: "sign"; name: string; signature: string; accept: boolean };
type Call = (action: CareAction | SignAction) => Promise<unknown>;
export type Upload = (type: DocType, slot: number, file: File, check?: object) => Promise<void>;

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[1.4rem] border border-[var(--line)] bg-bg-elevated p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const fieldClass = "h-11 w-full rounded-xl border border-[var(--line)] bg-bg px-3 text-sm outline-none focus:border-accent";

/* ── Documents ──────────────────────────────────────────────────────── */

const STATUS_TONE = { pending: "bg-amber-100 text-amber-800", approved: "bg-emerald-100 text-emerald-800", rejected: "bg-red-100 text-red-700" } as const;

export function DocumentsCard({ trip, upload }: { trip: Trip; upload: Upload }) {
  const [consentOpen, setConsentOpen] = useState(false);
  if (!trip.documents.length) return null;
  const done = trip.documents.filter((d) => d.status === "approved").length;
  const hasChildDocs = trip.documents.some((d) => d.type === "minor_consent");

  return (
    <Card title="Бичиг баримт" aside={<span className="text-xs font-semibold text-muted">{done}/{trip.documents.length} зөвшөөрсөн</span>}>
      <p className="mb-3 text-xs leading-relaxed text-muted">Зураг эсвэл PDF хуулна. Файлууд шифрлэгдэн хадгалагдаж, зөвхөн Elite Travel-ийн ажилтан харна.</p>
      <div className="space-y-2">
        {trip.documents.map((d) => (
          <DocRow key={`${d.type}-${d.slot}`} d={d} upload={upload} />
        ))}
      </div>
      {hasChildDocs ? (
        <button type="button" onClick={() => setConsentOpen(!consentOpen)} className="mt-3 text-xs font-semibold text-accent">
          {consentOpen ? "Хаах" : "Нотариатад өгөх мэдээлэл харах →"}
        </button>
      ) : null}
      {consentOpen ? <ConsentInfo trip={trip} /> : null}
    </Card>
  );
}

function DocRow({ d, upload }: { d: TripDocSlot; upload: Upload }) {
  const info = docInfo(d.type)!;
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<PhotoReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file?: File) {
    if (!file) return;
    setError(null);
    setReport(null);
    try {
      let check: PhotoReport | undefined;
      if (d.type === "visa_photo" && file.type.startsWith("image/")) {
        setBusy("Шалгаж байна…");
        check = await checkVisaPhoto(file);
        setReport(check);
      }
      setBusy("Хуулж байна…");
      const ready = await compressForUpload(file, d.type === "visa_photo" ? 1400 : 2000);
      await upload(d.type, d.slot, ready, check ? { ok: check.ok, checks: check.checks.map((c) => ({ id: c.id, ok: c.ok })), width: check.width, height: check.height } : undefined);
    } catch (e) {
      setError((e as Error).message || "Хуулж чадсангүй.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl bg-bg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {info.label}
            {d.label ? <span className="font-normal text-muted"> · {d.label}</span> : null}
          </p>
          <p className="text-[0.7rem] text-muted">{info.hint}</p>
        </div>
        {d.status ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${STATUS_TONE[d.status]}`}>{DOC_STATUS_LABEL[d.status]}</span> : null}
      </div>
      {d.status === "rejected" && d.note ? <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">{d.note}</p> : null}
      {report ? (
        <ul className="mt-2 space-y-0.5 text-[0.7rem]">
          {report.checks.map((c) => (
            <li key={c.id} className={c.ok ? "text-emerald-700" : "text-[#c2410c]"}>
              {c.ok ? "✓" : "✗"} {c.label}
              {!c.ok && c.tip ? <span className="block pl-3 text-muted">{c.tip}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {d.status !== "approved" ? (
        <label className={`mt-2 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-accent/50 bg-white text-sm font-semibold text-accent ${busy ? "pointer-events-none opacity-70" : ""}`}>
          {busy ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
              {busy}
            </>
          ) : d.status ? (
            "Дахин хуулах"
          ) : (
            "⬆ Хуулах"
          )}
          <input
            type="file"
            accept={d.type === "visa_photo" ? "image/*" : "image/*,application/pdf"}
            className="sr-only"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      ) : null}
      {error ? <p className="mt-1.5 text-xs text-[#c2410c]">{error}</p> : null}
    </div>
  );
}

/** Facts the notary needs to draw up the other parent's consent for a child travelling abroad. */
function ConsentInfo({ trip }: { trip: Trip }) {
  const kids = trip.kidsOwnBed + trip.kidsSharedBed;
  const rows: [string, string][] = [
    ["Аялал", trip.tourTitle],
    ["Огноо", trip.travelDate ?? "Тохиролцсон огноо"],
    ["Хүүхдийн тоо", String(kids)],
    ["Аяллын зохион байгуулагч", "Elite Travel Mongolia · +976 9003 1771"],
    ["Захиалгын дугаар", trip.id],
  ];
  return (
    <div className="mt-2 rounded-2xl border border-[var(--line)] bg-white p-3 text-xs leading-relaxed">
      <p className="font-semibold text-ink">Нотариатад өгөх мэдээлэл</p>
      <p className="mt-1 text-muted">
        Хүүхэд нэг эцэг эх эсвэл бусадтай гадаад явах бол нөгөө эцэг эх нь нотариатаар зөвшөөрөл батлуулдаг. Нотариатын газар маягтыг өөрөө бэлтгэнэ — доорх мэдээлэл, хүүхдийн төрсний
        гэрчилгээ, эцэг эхийн иргэний үнэмлэхийг авч очно уу. Эх хувийг хилээр гарахдаа биедээ авч явна.
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ── Emergency contact, diet, health ────────────────────────────────── */

export function CareCard({ trip, call }: { trip: Trip; call: Call }) {
  const [care, setCare] = useState<Care>(trip.care ?? { emergencyName: "", emergencyPhone: "" });
  const [open, setOpen] = useState(!trip.care);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof Care, v: string) => setCare((c) => ({ ...c, [k]: v }));

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await call({ action: "care", care });
      setMessage({ ok: true, text: "Хадгалагдлаа." });
      setOpen(false);
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Нэмэлт мэдээлэл" aside={<span className={`text-xs font-semibold ${trip.care ? "text-accent" : "text-muted"}`}>{trip.care ? "✓ Бөглөсөн" : "Бөглөөгүй"}</span>}>
      {!open ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="min-w-0 truncate text-muted">
            Яаралтай үед: <span className="font-semibold text-ink">{care.emergencyName}</span> · {care.emergencyPhone}
          </p>
          <button type="button" onClick={() => setOpen(true)} className="shrink-0 text-sm font-semibold text-accent">
            Засах
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-muted">Аяллын үеэр ямар нэг зүйл тохиолдвол бид Монголд байгаа энэ хүнд мэдэгдэнэ. Эрүүл мэндийн мэдээлэл шифрлэгдэн хадгалагдана.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <input value={care.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} placeholder="Яаралтай үед холбогдох хүн" className={`${fieldClass} sm:col-span-1`} />
            <input value={care.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} placeholder="Утас" inputMode="tel" className={fieldClass} />
            <input value={care.emergencyRelation ?? ""} onChange={(e) => set("emergencyRelation", e.target.value)} placeholder="Хэн болох (ээж, нөхөр…)" className={fieldClass} />
          </div>
          <textarea value={care.diet ?? ""} onChange={(e) => set("diet", e.target.value)} rows={2} maxLength={300} placeholder="Хоол: цагаан хоол, харшил (самар, далайн хоол…)" className={`${fieldClass} h-auto py-2.5`} />
          <textarea value={care.medical ?? ""} onChange={(e) => set("medical", e.target.value)} rows={2} maxLength={500} placeholder="Эрүүл мэнд: байнга уудаг эм, архаг өвчин, жирэмсэн эсэх" className={`${fieldClass} h-auto py-2.5`} />
          <textarea value={care.mobility ?? ""} onChange={(e) => set("mobility", e.target.value)} rows={2} maxLength={300} placeholder="Хөдөлгөөн: тэргэнцэр, шат өгсөхөд хүндрэлтэй гэх мэт" className={`${fieldClass} h-auto py-2.5`} />
          <div className="flex items-center gap-3">
            <button type="button" onClick={save} disabled={saving} className="h-11 rounded-2xl bg-accent px-6 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Хадгалж байна…" : "Хадгалах"}
            </button>
            {message ? <p className={`text-sm ${message.ok ? "text-accent" : "text-[#c2410c]"}`}>{message.text}</p> : null}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Contract ───────────────────────────────────────────────────────── */

function SignaturePad({ onChange }: { onChange: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const c = ref.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0a2a26";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  function finish() {
    if (!drawing.current) return;
    drawing.current = false;
    if (!dirty.current) return;
    // Export small: the stored signature only needs to be legible
    const src = ref.current!;
    const out = document.createElement("canvas");
    out.width = 600;
    out.height = Math.round((600 * src.height) / src.width);
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0, out.width, out.height);
    onChange(out.toDataURL("image/png"));
  }

  function clear() {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={ref}
        className="h-36 w-full touch-none rounded-xl border border-dashed border-[var(--line)] bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = point(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = point(e);
          ctx.lineTo(x, y);
          ctx.stroke();
          dirty.current = true;
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <div className="mt-1 flex justify-between text-[0.7rem] text-muted">
        <span>Хуруугаараа гарын үсгээ зурна уу</span>
        <button type="button" onClick={clear} className="font-semibold text-accent">
          Арилгах
        </button>
      </div>
    </div>
  );
}

function printContract(body: string, name: string, signedAt: string, signature: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  w.document.write(`<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>Гэрээ</title>
<style>body{font:14px/1.6 Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#111}pre{white-space:pre-wrap;font:inherit}
.sig{margin-top:32px;border-top:1px solid #ccc;padding-top:16px}img{height:80px}</style></head><body>
<pre>${esc(body)}</pre><div class="sig"><p>Захиалагч: <b>${esc(name)}</b><br>Цахимаар гарын үсэг зурсан: ${esc(new Date(signedAt).toLocaleString("mn-MN"))}</p>
<img src="${signature}" alt="Гарын үсэг"></div><script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

export function ContractCard({ trip, call }: { trip: Trip; call: Call }) {
  const c = trip.contract;
  const [accept, setAccept] = useState(false);
  const [name, setName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (c.state === "unavailable") return null;

  async function sign() {
    if (!signature) return;
    setSaving(true);
    setError(null);
    try {
      await call({ action: "sign", name, signature, accept });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Аяллын гэрээ" aside={<span className={`text-xs font-semibold ${c.state === "signed" ? "text-accent" : "text-[#c2410c]"}`}>{c.state === "signed" ? "✓ Гарын үсэг зурсан" : "Гарын үсэг хүлээж байна"}</span>}>
      <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-bg p-3 font-sans text-xs leading-relaxed text-ink">{c.body}</pre>
      {c.state === "signed" ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.signature} alt="Гарын үсэг" className="h-14 rounded-lg border border-[var(--line)] bg-white" />
          <p className="text-xs text-muted">
            {c.name}
            <br />
            {new Date(c.signedAt).toLocaleString("mn-MN")}
          </p>
          <button type="button" onClick={() => printContract(c.body, c.name, c.signedAt, c.signature)} className="ml-auto h-10 rounded-full bg-bg px-4 text-sm font-semibold text-accent">
            Хэвлэх / PDF
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="flex items-start gap-2.5 text-xs leading-relaxed text-ink">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[#0d8f84]" />
            Гэрээг бүрэн уншиж танилцсан бөгөөд нөхцөлийг хүлээн зөвшөөрч байна.
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Овог нэр" className={fieldClass} />
          <SignaturePad onChange={setSignature} />
          <button type="button" onClick={sign} disabled={saving || !accept || name.trim().length < 2 || !signature} className="h-12 w-full rounded-2xl bg-accent text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Хадгалж байна…" : "Гарын үсэг зурж баталгаажуулах"}
          </button>
          {error ? <p className="text-sm text-[#c2410c]">{error}</p> : null}
        </div>
      )}
    </Card>
  );
}
