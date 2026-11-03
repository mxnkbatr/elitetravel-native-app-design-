"use client";

import { saveTour } from "@/app/admin/(panel)/actions";
import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import Link from "next/link";
import { Field, GalleryField, ImageField, inputClass, LinesField, Section } from "@/app/admin/(panel)/fields";
import { SaveBar } from "@/app/admin/(panel)/SaveBar";
import type { ItineraryDay, Tour } from "@/data/tours";
import { DOC_TYPES } from "@/lib/documents";
import { useState } from "react";

const DESTINATIONS = [
  { key: "hainan", label: "Хайнань" },
  { key: "hongkong", label: "Хонг Конг" },
  { key: "bali", label: "Бали" },
  { key: "soon", label: "Удахгүй / бусад" },
] as const;

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[^\d]/g, "")));

export function TourEditor({ initial, originalId }: { initial: Tour; originalId: string | null }) {
  const [tour, setTour] = useState<Tour>(initial);
  const set = <K extends keyof Tour>(key: K, value: Tour[K]) => setTour((t) => ({ ...t, [key]: value }));
  const setPricing = (key: keyof NonNullable<Tour["pricing"]>, value: unknown) => setTour((t) => ({ ...t, pricing: { ...t.pricing, [key]: value } }));

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-28">
      <Link href="/admin/tours" className="inline-flex text-sm font-semibold text-accent">
        ‹ Аяллууд
      </Link>
      <AdminTitle title={originalId ? tour.title || "Аялал" : "Шинэ аялал"} />

      <Section title="Үндсэн мэдээлэл">
        <Field label="Гарчиг" wide>
          <input value={tour.title} onChange={(e) => set("title", e.target.value)} className={inputClass} />
        </Field>
        <Field label="ID (холбоос)" hint={`elitetravel.mn/tours/${tour.id || "…"} — жижиг латин үсэг, тоо, зураас`}>
          <input value={tour.id} onChange={(e) => set("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className={inputClass} />
        </Field>
        <Field label="Чиглэлийн бүс" hint="Газрын зураг, цэсэнд хаана харагдах">
          <select value={tour.destinationKey} onChange={(e) => set("destinationKey", e.target.value as Tour["destinationKey"])} className={inputClass}>
            {DESTINATIONS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Чиглэл (харагдах нэр)">
          <input value={tour.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Хайнань, Хятад" className={inputClass} />
        </Field>
        <Field label="Хугацаа">
          <input value={tour.duration} onChange={(e) => set("duration", e.target.value)} placeholder="8 өдөр 7 шөнө" className={inputClass} />
        </Field>
        <Field label="Шөнийн тоо">
          <input inputMode="numeric" value={tour.nights ?? ""} onChange={(e) => set("nights", numOrNull(e.target.value))} className={inputClass} />
        </Field>
        <Field label="Огноонууд" hint="Олон огноо бол « · » тэмдгээр тусгаарла: 11/03–11/10 · 11/10–11/17" wide>
          <input value={tour.dates ?? ""} onChange={(e) => set("dates", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Нислэг / хөдлөх">
          <input value={tour.departure ?? ""} onChange={(e) => set("departure", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Буудал">
          <input value={tour.stay ?? ""} onChange={(e) => set("stay", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Шошго">
          <select value={tour.tag ?? ""} onChange={(e) => set("tag", (e.target.value || undefined) as Tour["tag"])} className={inputClass}>
            <option value="">—</option>
            <option value="hot">Эрэлттэй</option>
            <option value="sale">Хямдрал</option>
            <option value="soon">Удахгүй (захиалга хаалттай)</option>
          </select>
        </Field>
        <Field label="Хямдралын тэмдэг" hint="Жишээ: -8%">
          <input value={tour.discount ?? ""} onChange={(e) => set("discount", e.target.value)} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
          <input type="checkbox" checked={tour.status === "ended"} onChange={(e) => set("status", e.target.checked ? "ended" : undefined)} className="size-4 accent-[#0d8f84]" />
          Дууссан аялал — жагсаалтаас нуух (холбоосоор нээгдсээр байна)
        </label>
        <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
          <input type="checkbox" checked={tour.unlisted === true} onChange={(e) => set("unlisted", e.target.checked ? true : undefined)} className="size-4 accent-[#0d8f84]" />
          Нууц (туршилтын) аялал — зөвхөн холбоосоор захиалагдана, сайт, хайлт, чатад харагдахгүй
        </label>
      </Section>

      <Section title="Үнэ">
        <Field label="Үнэ (₮, том хүн)" hint="Хоосон бол «Удахгүй»">
          <input inputMode="numeric" value={tour.price ?? ""} onChange={(e) => set("price", numOrNull(e.target.value))} className={inputClass} />
        </Field>
        <Field label="Хуучин үнэ (₮)" hint="Хямдралтай үед зурааслаж харуулна">
          <input inputMode="numeric" value={tour.oldPrice ?? ""} onChange={(e) => set("oldPrice", numOrNull(e.target.value))} className={inputClass} />
        </Field>
        <Field label="Хүүхэд, эцэг эхтэй нэг оронд (₮)">
          <input inputMode="numeric" value={tour.pricing?.childSharedBed ?? ""} onChange={(e) => setPricing("childSharedBed", numOrNull(e.target.value) ?? undefined)} className={inputClass} />
        </Field>
        <Field label="Ганц өрөөний нэмэгдэл (₮)">
          <input inputMode="numeric" value={tour.pricing?.singleSupplement ?? ""} onChange={(e) => setPricing("singleSupplement", numOrNull(e.target.value) ?? undefined)} className={inputClass} />
        </Field>
        <Field label="Урьдчилгаа (%)">
          <input inputMode="numeric" value={tour.pricing?.depositPercent ?? ""} onChange={(e) => setPricing("depositPercent", numOrNull(e.target.value) ?? undefined)} className={inputClass} />
        </Field>
        <Field label="Хүүхдийн үнийн тайлбар">
          <input value={tour.pricing?.child ?? ""} onChange={(e) => setPricing("child", e.target.value)} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
          <input type="checkbox" checked={tour.pricing?.childOwnBed === false} onChange={(e) => setPricing("childOwnBed", e.target.checked ? false : undefined)} className="size-4 accent-[#0d8f84]" />
          Хүүхэд тусдаа орны үнэ байхгүй
        </label>
      </Section>

      <Section title="Зураг">
        <ImageField label="Нүүр зураг" value={tour.image} onChange={(v) => set("image", v)} />
        <GalleryField value={tour.gallery} onChange={(v) => set("gallery", v)} />
      </Section>

      <Section title="Тайлбар">
        <Field label="Товч тайлбар" hint="Карт, хайлтад гарна" wide>
          <textarea rows={2} value={tour.description} onChange={(e) => set("description", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Дэлгэрэнгүй түүх" wide>
          <textarea rows={5} value={tour.story} onChange={(e) => set("story", e.target.value)} className={inputClass} />
        </Field>
        <LinesField label="Онцлох зүйлс" value={tour.highlights} onChange={(v) => set("highlights", v)} />
        <LinesField label="Үнэд багтсан" value={tour.includes} onChange={(v) => set("includes", v)} />
        <LinesField label="Үнэд багтаагүй" value={tour.excludes} onChange={(v) => set("excludes", v)} />
        <LinesField label="Санамж" value={tour.notes ?? []} onChange={(v) => set("notes", v)} rows={3} />
      </Section>

      <ItineraryEditor days={tour.itinerary} onChange={(v) => set("itinerary", v)} />

      <Section title="Аялагчаас авах баримт">
        <p className="-mt-2 text-xs text-muted sm:col-span-2">Сонгосон баримтуудыг аялагч аппаараа хуулна. Тоо нь хүний тооноос хамаарна (жишээ нь зураг зорчигч бүрээс, төрсний гэрчилгээ хүүхэд бүрээс).</p>
        {DOC_TYPES.map((d) => {
          const on = tour.documents?.includes(d.type) ?? false;
          return (
            <label key={d.type} className={`flex items-start gap-3 rounded-xl border p-3 text-sm transition ${on ? "border-accent bg-accent/[0.05]" : "border-[var(--line)]"}`}>
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => set("documents", e.target.checked ? [...(tour.documents ?? []), d.type] : (tour.documents ?? []).filter((x) => x !== d.type))}
                className="mt-0.5 size-4 accent-[#0d8f84]"
              />
              <span>
                <span className="block font-semibold">{d.label}</span>
                <span className="block text-xs text-muted">{d.hint}</span>
              </span>
            </label>
          );
        })}
      </Section>

      <SaveBar
        kind="tours"
        id={tour.id}
        originalId={originalId}
        onSave={() => saveTour(tour, originalId)}
      />
    </div>
  );
}

function ItineraryEditor({ days, onChange }: { days: ItineraryDay[]; onChange: (d: ItineraryDay[]) => void }) {
  const update = (i: number, patch: Partial<ItineraryDay>) => onChange(days.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const move = (i: number, to: number) => {
    if (to < 0 || to >= days.length) return;
    const next = [...days];
    const [d] = next.splice(i, 1);
    next.splice(to, 0, d);
    onChange(next);
  };

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-6">
      <h2 className="mb-4 font-display text-xl font-semibold">Хөтөлбөр</h2>
      <div className="space-y-3">
        {days.map((d, i) => (
          <div key={i} className="rounded-xl border border-[var(--line)] bg-[#f8faf9] p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-white">{i + 1}</span>
              <div className="ml-auto flex gap-1">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-white disabled:opacity-25">▲</button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === days.length - 1} className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-white disabled:opacity-25">▼</button>
                <button type="button" onClick={() => onChange(days.filter((_, j) => j !== i))} className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Устгах</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <input value={d.day} onChange={(e) => update(i, { day: e.target.value })} placeholder="1-р өдөр" className={inputClass} />
              <input value={d.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Гарчиг" className={inputClass} />
              <textarea rows={3} value={d.detail} onChange={(e) => update(i, { detail: e.target.value })} placeholder="Тайлбар" className={`${inputClass} sm:col-span-2`} />
              <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                <input value={d.flight ?? ""} onChange={(e) => update(i, { flight: e.target.value })} placeholder="Нислэг (заавал биш)" className={inputClass} />
                <input value={d.meals ?? ""} onChange={(e) => update(i, { meals: e.target.value })} placeholder="Хоол (заавал биш)" className={inputClass} />
                <input value={d.hotel ?? ""} onChange={(e) => update(i, { hotel: e.target.value })} placeholder="Буудал (заавал биш)" className={inputClass} />
                <input value={d.host ?? ""} onChange={(e) => update(i, { host: e.target.value })} placeholder="Хөтөч (заавал биш)" className={inputClass} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...days, { day: `${days.length + 1}-р өдөр`, title: "", detail: "" }])}
        className="mt-3 w-full rounded-xl border-2 border-dashed border-[var(--line)] py-3 text-sm font-semibold text-accent hover:border-accent"
      >
        + Өдөр нэмэх
      </button>
    </section>
  );
}
