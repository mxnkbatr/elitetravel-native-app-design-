"use client";

import { createManualBooking } from "@/app/admin/(panel)/actions";
import { toast } from "@/app/admin/(panel)/feedback";
import { inputClass } from "@/app/admin/(panel)/fields";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { formatPrice, tourDates, type Tour, type TourSummary } from "@/data/tours";
import { quote } from "@/lib/pricing";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type TourOption = Pick<Tour, "id" | "title" | "price" | "dates" | "pricing">;

function Stepper({
  label,
  value,
  min = 0,
  max = 12,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-bg px-3.5 py-3">
      <p className="text-sm font-semibold">{label}</p>
      <div className="flex items-center gap-2">
        <button type="button" disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-white text-lg disabled:opacity-30">
          −
        </button>
        <span className="w-6 text-center font-num text-lg font-semibold tabular-nums">{value}</span>
        <button type="button" disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-10 place-items-center rounded-full bg-accent/10 text-lg text-accent disabled:opacity-30">
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Phone-first sheet: staff register a walk-in / call-in traveller by hand.
 */
export function ManualBookingForm({
  tours,
  presetTourId,
  presetDate,
  canManage,
}: {
  tours: TourOption[];
  presetTourId?: string;
  presetDate?: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tourId, setTourId] = useState(presetTourId ?? tours[0]?.id ?? "");
  const [date, setDate] = useState(presetDate ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [adults, setAdults] = useState(1);
  const [kidsOwnBed, setKidsOwnBed] = useState(0);
  const [kidsSharedBed, setKidsSharedBed] = useState(0);
  const [singleRooms, setSingleRooms] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const tour = tours.find((t) => t.id === tourId);
  const dates = tour ? tourDates(tour) : [];
  const pricing = useMemo(
    () => (tour ? quote(tour as TourSummary, { adults, kidsOwnBed, kidsSharedBed, singleRooms }) : null),
    [tour, adults, kidsOwnBed, kidsSharedBed, singleRooms],
  );

  if (!canManage || !tours.length) return null;

  function reset() {
    setName("");
    setPhone("");
    setAdults(1);
    setKidsOwnBed(0);
    setKidsSharedBed(0);
    setSingleRooms(0);
    setNote("");
    setError(null);
    if (!presetTourId) setTourId(tours[0]?.id ?? "");
    if (!presetDate) setDate("");
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await createManualBooking({
        tourId,
        date: date || dates[0] || undefined,
        name,
        phone,
        adults,
        kidsOwnBed,
        kidsSharedBed,
        singleRooms,
        note: note || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      toast(`${res.id} бүртгэгдлээ`);
      setOpen(false);
      reset();
      router.push(`/admin?q=${res.id}&tab=people`);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,143,132,0.25)] transition active:scale-[0.97]"
      >
        <Icon name="users" size={15} /> Аялагч нэмэх
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Аялагч нэмэх">
        <p className="-mt-1 mb-4 text-xs leading-relaxed text-muted">Утсаар эсвэл биеэр ирсэн хүнийг гар аргаар бүртгэнэ. Аппаас ирсэнтэй ижил захиалга үүснэ.</p>

        <div className="space-y-3">
          {!presetTourId ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Аялал</span>
              <select
                value={tourId}
                onChange={(e) => {
                  setTourId(e.target.value);
                  setDate("");
                }}
                className={inputClass}
              >
                {tours.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="rounded-2xl bg-bg px-3.5 py-3 text-sm font-semibold">{tour?.title}</p>
          )}

          {dates.length > 1 ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted">Огноо</p>
              <div className="flex flex-wrap gap-2">
                {dates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDate(d)}
                    className={`min-h-11 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${(date || dates[0]) === d ? "border-accent bg-accent text-white" : "border-[var(--line)] bg-white"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          ) : dates[0] ? (
            <p className="rounded-2xl bg-bg px-3.5 py-3 text-sm">
              <span className="text-muted">Огноо · </span>
              <span className="font-semibold">{presetDate || dates[0]}</span>
            </p>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted">Нэр</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Батбаяр" autoComplete="name" className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted">Утас</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9003 1771" inputMode="tel" autoComplete="tel" className={inputClass} />
          </label>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted">Хүний тоо</p>
            <div className="space-y-2">
              <Stepper label="Том хүн" value={adults} min={1} onChange={setAdults} />
              <Stepper label="Хүүхэд, тусдаа ор" value={kidsOwnBed} onChange={setKidsOwnBed} />
              <Stepper label="Хүүхэд, хамт унтах" value={kidsSharedBed} onChange={setKidsSharedBed} />
              <Stepper label="Ганцаараа өрөө" value={singleRooms} max={adults} onChange={setSingleRooms} />
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted">Тэмдэглэл (заавал биш)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClass} placeholder="Жишээ: оффис дээр ирсэн" />
          </label>

          {pricing ? (
            <div className="flex items-baseline justify-between rounded-2xl bg-accent/10 px-4 py-3">
              <span className="text-sm font-semibold text-accent">Урьдчилсан дүн</span>
              <span className="font-num text-xl font-semibold text-accent">{formatPrice(pricing.total)}</span>
            </div>
          ) : null}

          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button
            type="button"
            disabled={pending || name.trim().length < 2 || phone.trim().length < 8}
            onClick={submit}
            className="flex h-12 w-full items-center justify-center rounded-full bg-accent text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Бүртгэж байна…" : "Бүртгэх"}
          </button>
        </div>
      </Sheet>
    </>
  );
}
