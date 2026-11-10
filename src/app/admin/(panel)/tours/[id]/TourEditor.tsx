"use client";

import { saveTour } from "@/app/admin/(panel)/actions";
import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import Link from "next/link";
import { Field, GalleryField, ImageField, inputClass, LinesField, Section } from "@/app/admin/(panel)/fields";
import { SaveBar } from "@/app/admin/(panel)/SaveBar";
import { TourDatesEditor } from "@/components/TourDatesEditor";
import { DESTINATION_PRESETS, formatPrice, slugDestinationKey, tourDates, type DatePrice, type ItineraryDay, type Tour } from "@/data/tours";
import { DOC_TYPES } from "@/lib/documents";
import { useState } from "react";

const CUSTOM = "__custom__";
const isPresetKey = (key: string) => DESTINATION_PRESETS.some((d) => d.key === key);

const HOTEL_SUGGESTIONS = [
  "Timton Fuhe Hotel, Саняа",
  "Bing Tang Bali Resort",
  "Harbour Plaza & Degrees",
] as const;

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[^\d]/g, "")));

export function TourEditor({ initial, originalId }: { initial: Tour; originalId: string | null }) {
  const [tour, setTour] = useState<Tour>(initial);
  // What was last saved; anything different is an unsaved edit
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [customDest, setCustomDest] = useState(() => !isPresetKey(initial.destinationKey));
  const set = <K extends keyof Tour>(key: K, value: Tour[K]) => setTour((t) => ({ ...t, [key]: value }));
  const setPricing = (key: keyof NonNullable<Tour["pricing"]>, value: unknown) => setTour((t) => ({ ...t, pricing: { ...t.pricing, [key]: value } }));
  const departureLabels = tourDates(tour);

  function setDates(nextDates: string) {
    const labels = new Set(tourDates({ dates: nextDates }));
    setTour((t) => {
      const pruned: Record<string, DatePrice> = {};
      for (const [label, price] of Object.entries(t.datePrices ?? {})) {
        if (labels.has(label)) pruned[label] = price;
      }
      return {
        ...t,
        dates: nextDates || undefined,
        datePrices: Object.keys(pruned).length ? pruned : undefined,
      };
    });
  }

  function setDatePrice(label: string, field: keyof DatePrice, raw: string) {
    const value = numOrNull(raw);
    setTour((t) => {
      const cur = { ...(t.datePrices ?? {}) };
      const prev = cur[label];
      if (value == null) {
        if (!prev) return t;
        const next = { ...prev };
        if (field === "price") {
          delete cur[label];
        } else {
          delete next[field];
          if (next.price == null) delete cur[label];
          else cur[label] = next;
        }
      } else {
        if (field !== "price" && !prev && t.price == null) return t;
        const base: DatePrice = prev ?? { price: t.price as number };
        cur[label] = { ...base, [field]: value };
      }
      return { ...t, datePrices: Object.keys(cur).length ? cur : undefined };
    });
  }

  const pickDestination = (value: string) => {
    if (value === CUSTOM) {
      setCustomDest(true);
      if (isPresetKey(tour.destinationKey)) set("destinationKey", "");
      return;
    }
    setCustomDest(false);
    const preset = DESTINATION_PRESETS.find((d) => d.key === value);
    setTour((t) => ({
      ...t,
      destinationKey: value,
      destination: t.destination.trim() ? t.destination : (preset?.label ?? t.destination),
    }));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-28">
      <Link href="/admin/tours" className="inline-flex text-sm font-semibold text-accent">
        ‹ Аялал
      </Link>
      <AdminTitle
        title={originalId ? tour.title || "Аялал засах" : "Аялал нэмэх"}
        sub={originalId ? "Доорх хэсгүүдийг бөглөөд доор хадгална." : "Шинэ аяллын мэдээллийг хэсэг хэсгээр бөглөнө."}
        action={
          originalId ? (
            <Link href={`/admin/departures/${originalId}`} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-accent">
              Аялагчид ›
            </Link>
          ) : null
        }
      />

      <Section title="1. Үндсэн" hint="Нэр, чиглэл, хэд хоног, огноо — эхлээд эдгээрийг бөглө.">
        <Field label="Аяллын нэр" wide>
          <input value={tour.title} onChange={(e) => set("title", e.target.value)} placeholder="Жишээ: Хайнань 8 хоног" className={inputClass} />
        </Field>
        <Field label="Холбоос (ID)" hint={`elitetravel.mn/tours/${tour.id || "…"}`}>
          <input value={tour.id} onChange={(e) => set("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className={inputClass} />
        </Field>
        <Field label="Чиглэлийн бүс" hint="Жагсаалтаас сонгох эсвэл өөрөө нэмэх — цэс, шүүлтүүрт ашиглагдана">
          <select value={customDest ? CUSTOM : tour.destinationKey} onChange={(e) => pickDestination(e.target.value)} className={inputClass}>
            {DESTINATION_PRESETS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
            <option value={CUSTOM}>Өөрөө нэмэх…</option>
          </select>
          {customDest ? (
            <input
              value={tour.destinationKey}
              onChange={(e) => set("destinationKey", slugDestinationKey(e.target.value))}
              placeholder="жишээ: dubai, tokyo, phuket"
              className={`${inputClass} mt-2`}
              autoComplete="off"
            />
          ) : null}
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
        <TourDatesEditor value={tour.dates ?? ""} onChange={setDates} />
        <Field label="Нислэг / хөдлөх">
          <input value={tour.departure ?? ""} onChange={(e) => set("departure", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Буудал" hint="Жагсаалтаас сонгох эсвэл өөрөө бичнэ — Буудлууд хуудсанд гарна">
          <input
            list="hotel-suggestions"
            value={tour.stay ?? ""}
            onChange={(e) => set("stay", e.target.value)}
            placeholder="Жишээ: Atlantis Sanya, Саняа"
            className={inputClass}
            autoComplete="off"
          />
          <datalist id="hotel-suggestions">
            {HOTEL_SUGGESTIONS.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
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
          Дууссан аялал — жагсаалтаас нуух
        </label>
        <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
          <input type="checkbox" checked={tour.unlisted === true} onChange={(e) => set("unlisted", e.target.checked ? true : undefined)} className="size-4 accent-[#0d8f84]" />
          Нууц туршилтын аялал — зөвхөн холбоосоор
        </label>
      </Section>

      <Section title="2. Үнэ" hint="Үндсэн үнэ + огноо бүрт өөр үнэ. Хоосон огноо = үндсэн үнэ.">
        <Field label="Үндсэн үнэ (₮, том хүн)" hint="Хоосон бол «Удахгүй». Огноонд тусдаа үнэ байхгүй үед үүнийг ашиглана.">
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

        {departureLabels.length > 0 ? (
          <div className="sm:col-span-2 space-y-3 rounded-2xl border border-[var(--line)] bg-[#f8faf9] p-3 sm:p-4">
            <div>
              <p className="text-xs font-semibold text-ink">Огноо бүрийн үнэ</p>
              <p className="mt-0.5 text-[0.7rem] text-muted">
                Хоосон бол үндсэн үнэ ({tour.price != null ? formatPrice(tour.price) : "—"}) ашиглагдана. Захиалга сонгосон огнооны үнээр тооцогдоно.
              </p>
            </div>
            <div className="space-y-3">
              {departureLabels.map((label, i) => {
                const row = tour.datePrices?.[label];
                return (
                  <div key={label} className="grid gap-2 rounded-xl border border-[var(--line)] bg-white p-3 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] sm:items-end">
                    <div className="min-w-0">
                      <p className="text-[0.7rem] font-semibold text-muted">{i + 1}-р хөдлөх</p>
                      <p className="truncate text-sm font-semibold text-ink">{label}</p>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-[0.7rem] font-semibold text-muted">Том хүн</span>
                      <input
                        inputMode="numeric"
                        value={row?.price ?? ""}
                        placeholder={tour.price != null ? String(tour.price) : ""}
                        onChange={(e) => setDatePrice(label, "price", e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[0.7rem] font-semibold text-muted">Хүүхэд (хамт)</span>
                      <input
                        inputMode="numeric"
                        value={row?.childSharedBed ?? ""}
                        placeholder={tour.pricing?.childSharedBed != null ? String(tour.pricing.childSharedBed) : ""}
                        onChange={(e) => setDatePrice(label, "childSharedBed", e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[0.7rem] font-semibold text-muted">Хуучин үнэ</span>
                      <input
                        inputMode="numeric"
                        value={row?.oldPrice ?? ""}
                        placeholder={tour.oldPrice != null ? String(tour.oldPrice) : ""}
                        onChange={(e) => setDatePrice(label, "oldPrice", e.target.value)}
                        className={inputClass}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </Section>

      <Section title="3. Зураг" hint="Нүүр зураг сайт, апп дээр том харагдана.">
        <ImageField label="Нүүр зураг" value={tour.image} onChange={(v) => set("image", v)} />
        <GalleryField value={tour.gallery} onChange={(v) => set("gallery", v)} />
      </Section>

      <Section title="4. Тайлбар" hint="Товч нь жагсаалтад, дэлгэрэнгүй нь аяллын хуудсанд.">
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

      <Section title="5. Баримт" hint="Аялагч аппаараа хуулах ёстой баримтууд.">
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
        dirty={JSON.stringify(tour) !== saved}
        onSave={async () => {
          const res = await saveTour(tour, originalId);
          if (res.ok) setSaved(JSON.stringify(tour));
          return res;
        }}
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
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white shadow-[0_8px_24px_rgba(6,42,42,0.04)]">
      <header className="border-b border-[var(--line)] bg-[#f7faf9] px-4 py-4 sm:px-6">
        <h2 className="font-display text-[1.35rem] font-semibold leading-tight">Өдөр тутмын хөтөлбөр</h2>
        <p className="mt-1 text-xs text-muted">Өдөр бүрийн гарчиг, тайлбар. Доор «Өдөр нэмэх» дар.</p>
      </header>
      <div className="p-4 sm:p-6">
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
      </div>
    </section>
  );
}
