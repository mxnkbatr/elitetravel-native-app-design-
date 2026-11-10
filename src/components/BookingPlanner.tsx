"use client";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { BoardingPass } from "@/components/BoardingPass";
import { DateRangeCalendar } from "@/components/DateRangeCalendar";
import { Icon } from "@/components/Icon";
import { PartnerLogo } from "@/components/PartnerLogo";
import { initialCalculatorState, TourPriceCalculator, useTourCalculator } from "@/components/TourPriceCalculator";
import { formatPrice, priceForDate, tourDates, type Tour, type TourSummary } from "@/data/tours";
import { useAccount } from "@/lib/account";
import { useSeats } from "@/lib/content";
import { formatDateRange, parseDateRange, rangeDayCount } from "@/lib/dates";
import { haptic } from "@/lib/native";
import { quote } from "@/lib/pricing";
import { calculatorPayload, type CalculatorState } from "@/lib/tour-calculator";
import { track, trackOnce } from "@/lib/track";
import { addBooking, type BookingRequest } from "@/lib/traveller-store";
import { INSTALLMENT_PROVIDERS } from "@/lib/trips";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

const PHONE = "+97690031771";
const INSTAGRAM_DM = "https://ig.me/m/elitetravelmn";

export function bookingMessage(tour: TourSummary, b: Omit<BookingRequest, "id" | "createdAt"> & { id?: string }) {
  const party = [
    `${b.adults} том хүн`,
    b.kidsOwnBed ? `${b.kidsOwnBed} хүүхэд (тусдаа ор)` : "",
    b.kidsSharedBed ? `${b.kidsSharedBed} хүүхэд (хамт унтах)` : "",
  ]
    .filter(Boolean)
    .join(", ");
  return [
    `Сайн байна уу! ${tour.title} аялалд захиалга өгөх хүсэлтэй байна.`,
    b.id ? `Хүсэлтийн дугаар: ${b.id}` : "",
    b.date ? `Огноо: ${b.date}` : "",
    `Хүн: ${party}`,
    b.singleRooms ? `Ганцаараа өрөө: ${b.singleRooms}` : "",
    `Урьдчилсан дүн: ${formatPrice(b.total)}`,
    `Нэр: ${b.name}, утас: ${b.phone}`,
    b.note ? `Тэмдэглэл: ${b.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function Stepper({
  label,
  hint,
  value,
  min = 0,
  max = 12,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-bg px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foam">{label}</p>
        {hint ? <p className="mt-0.5 text-[0.7rem] leading-snug text-muted">{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={`${label} хасах`}
          disabled={value <= min}
          onClick={() => {
            haptic("tap");
            onChange(value - 1);
          }}
          className="tap grid size-11 place-items-center rounded-full border border-[var(--line)] bg-bg-elevated text-lg leading-none transition enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-30"
        >
          −
        </button>
        <motion.span key={value} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-6 text-center font-num text-lg font-semibold tabular-nums">
          {value}
        </motion.span>
        <button
          type="button"
          aria-label={`${label} нэмэх`}
          disabled={value >= max}
          onClick={() => {
            haptic("tap");
            onChange(value + 1);
          }}
          className="tap grid size-11 place-items-center rounded-full border border-accent/30 bg-accent/10 text-lg leading-none text-accent transition enabled:hover:bg-accent enabled:hover:text-white disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}

const STEPS = ["Аялагчид", "Холбоо барих", "Баталгаа"];

function Steps({ current }: { current: number }) {
  return (
    <ol className="mb-4 flex items-start gap-2" aria-label="Захиалгын алхам">
      {STEPS.map((label, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <li key={label} className="flex-1" aria-current={on ? "step" : undefined}>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--line)]">
              <motion.div className="h-full bg-accent" initial={false} animate={{ width: done || on ? "100%" : "0%" }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <p className={`mt-1.5 flex items-center gap-1 text-[0.68rem] font-semibold ${done || on ? "text-accent" : "text-muted"}`}>
              {done ? <Icon name="check" size={12} strokeWidth={2.6} /> : <span className="font-num">{i + 1}.</span>}
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Live price estimate + booking request.
 * Tours with `calculator.enabled` use the Lovable room calculator; others keep the legacy steppers.
 */
export function BookingPlanner({ tour, variant = "card" }: { tour: Tour; variant?: "card" | "sheet" }) {
  const stepped = variant === "sheet";
  const [step, setStep] = useState(0);
  const p = tour.pricing ?? {};
  const useCalc = tour.calculator?.enabled === true;
  const dateOptions = tourDates(tour);
  const seats = useSeats(tour.id);
  const calendarOptions = useMemo(
    () =>
      dateOptions
        .map((label) => {
          const range = parseDateRange(label);
          return range ? { label, range, disabled: Boolean(seats[label]?.closed) } : null;
        })
        .filter((x): x is { label: string; range: NonNullable<ReturnType<typeof parseDateRange>>; disabled: boolean } => x != null),
    [dateOptions, seats],
  );
  const useCalendar = calendarOptions.length > 0;

  const [calcState, setCalcState] = useState<CalculatorState>(() => initialCalculatorState(2));
  const calcQuote = useTourCalculator(tour, calcState);

  const [adults, setAdults] = useState(2);
  const [kidsOwnBed, setKidsOwnBed] = useState(0);
  const [kidsSharedBed, setKidsSharedBed] = useState(0);
  const [singleRooms, setSingleRooms] = useState(0);
  const [date, setDate] = useState(dateOptions.find((d) => !seats[d]?.closed) ?? dateOptions[0] ?? "");
  const [waitlisted, setWaitlisted] = useState(false);

  const party = useCalc
    ? calcQuote.party
    : { adults, kidsOwnBed, kidsSharedBed, singleRooms };
  const people = party.adults + party.kidsOwnBed + party.kidsSharedBed;
  const selectedRange = useMemo(() => parseDateRange(date), [date]);
  const seatInfo = seats[date];
  const willWaitlist = seatInfo != null && !seatInfo.closed && seatInfo.left < people;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const account = useAccount();
  const [prefilled, setPrefilled] = useState(false);
  if (!prefilled && account.profile) {
    setPrefilled(true);
    if (!name) setName(account.profile.name);
    if (!phone) setPhone(account.profile.phone);
  }
  const [note, setNote] = useState("");
  const [done, setDone] = useState<BookingRequest | null>(null);
  const [copied, setCopied] = useState(false);

  const ownBedAllowed = p.childOwnBed !== false;
  const rates = useMemo(() => priceForDate(tour, date), [tour, date]);
  const legacyQuote = useMemo(
    () => quote(tour, { adults, kidsOwnBed, kidsSharedBed, singleRooms }, date),
    [tour, adults, kidsOwnBed, kidsSharedBed, singleRooms, date],
  );

  const total = useCalc ? calcQuote.total : legacyQuote.total;
  const deposit = useCalc ? calcQuote.deposit : legacyQuote.deposit;
  const lines = useCalc ? calcQuote.lines : legacyQuote.lines;
  const quoteReady = useCalc ? calcQuote.ready : true;

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");

  if (rates.price == null && !(useCalc && tour.calculator?.adultPrice != null)) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending || !quoteReady) return;
    setSending(true);
    setError(null);
    const calc = useCalc ? calculatorPayload(calcState, calcQuote) : undefined;
    const request = {
      tourId: tour.id,
      name,
      phone,
      date,
      adults: party.adults,
      kidsOwnBed: party.kidsOwnBed,
      kidsSharedBed: party.kidsSharedBed,
      singleRooms: party.singleRooms,
      note: note || undefined,
      calculator: calc,
    };
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; total?: number; deposit?: number; token?: string; status?: string; error?: string };
      if (res.status === 400) {
        setError(data.error ?? "Мэдээллээ шалгана уу.");
        track("booking_error", { tour: tour.id });
        return;
      }
      if (res.ok && data.id) {
        track("booking_submit", { tour: tour.id });
        haptic("success");
        setWaitlisted(data.status === "waitlist");
        setDone(addBooking({ ...request, id: data.id, total: data.total ?? total, deposit: data.deposit ?? deposit, synced: true, token: data.token }));
        return;
      }
      throw new Error(data.error ?? `HTTP ${res.status}`);
    } catch {
      setDone(addBooking({ ...request, total, deposit, synced: false }));
    } finally {
      setSending(false);
    }
  }

  async function copyMessage(b: BookingRequest) {
    try {
      await navigator.clipboard.writeText(bookingMessage(tour, b));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      id={stepped ? undefined : "book"}
      className={
        stepped
          ? "min-w-0"
          : "min-w-0 max-h-[calc(100dvh-6.5rem)] scroll-mt-28 overflow-x-hidden overflow-y-auto overscroll-contain rounded-[1.5rem] border border-[var(--line)] bg-bg-elevated p-5 shadow-[var(--shadow)]"
      }
    >
      {stepped ? <Steps current={done ? 2 : step} /> : null}
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <BoardingPass tour={tour} booking={done} state={!done.synced ? "offline" : waitlisted ? "waitlist" : "sent"} />
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {!done.synced
                ? "Сүлжээний алдаанаас болж хүсэлт манай системд очсонгүй. Мессежийг хуулаад Instagram-аар илгээх эсвэл шууд залгаарай."
                : waitlisted
                  ? "Сонгосон огноо дүүрсэн байна. Суудал гармагц «Миний захиалга» хэсэгт мэдэгдэнэ."
                  : "Таны хүсэлт манай багт очлоо. Захиалгынхаа төлөв, төлбөр, багтай чатлахыг «Миний захиалга» хэсгээс харна."}
            </p>
            <div className="mt-5 grid gap-2">
              {done.token ? (
                <Link href={`/bookings/${done.id}`} className="btn-shine flex h-12 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                  Захиалгаа нээх · чат, төлбөр →
                </Link>
              ) : null}
              <a
                href={INSTAGRAM_DM}
                target="_blank"
                rel="noreferrer"
                onClick={() => copyMessage(done)}
                className={
                  done.token
                    ? "flex h-11 items-center justify-center rounded-full border border-[var(--line)] text-sm font-medium"
                    : "btn-shine flex h-12 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
                }
              >
                Мессеж хуулаад Instagram нээх
              </a>
              <a href={`tel:${PHONE}`} className="flex h-11 items-center justify-center rounded-full border border-[var(--line)] text-sm font-medium">
                Залгах · +976 9003 1771
              </a>
              {copied ? <p className="text-xs text-accent">Мессеж хуулагдлаа — Instagram дээр paste хийгээрэй.</p> : null}
              {!done.token ? (
                <Link href="/bookings" className="mt-1 text-sm font-semibold text-accent">
                  Миний захиалгууд →
                </Link>
              ) : null}
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={submit}
            onPointerDownCapture={() => trackOnce(`booking-${tour.id}`, "booking_open", { tour: tour.id })}
            onFocusCapture={() => trackOnce(`booking-${tour.id}`, "booking_open", { tour: tour.id })}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AnimatePresence initial={false}>
              {!stepped || step === 0 ? (
                <motion.div key="people" initial={stepped ? { opacity: 0, x: -24 } : false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, transition: { duration: 0 } }} transition={{ duration: 0.25 }}>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted">Үнэ / хүн{date ? " · сонгосон огноо" : ""}</p>
                      <p className="mt-1 font-num text-3xl font-semibold text-accent">
                        {formatPrice(useCalc ? calcQuote.adultPrice : rates.price)}
                      </p>
                      {!useCalc && rates.oldPrice ? <p className="text-sm text-muted line-through">{formatPrice(rates.oldPrice)}</p> : null}
                    </div>
                    {tour.discount ? <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{tour.discount}</span> : null}
                  </div>

                  {useCalendar ? (
                    <div className="mt-5 min-w-0">
                      <div className="mb-2 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <p className="type-label text-muted">Огноо сонгох</p>
                          <p className="mt-0.5 text-[0.7rem] text-muted">
                            {calendarOptions.length > 1 ? "Ээлжээ сонгоод календараас шалгана" : "Календараас хөдлөх өдрөө дарна уу"}
                          </p>
                        </div>
                        {selectedRange ? (
                          <p className="shrink-0 text-right text-xs font-semibold text-accent">
                            {formatDateRange(selectedRange)}
                            <span className="mt-0.5 block font-normal text-muted">{rangeDayCount(selectedRange)} өдөр</span>
                          </p>
                        ) : null}
                      </div>
                      {calendarOptions.length > 1 ? (
                        <div className="hide-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1">
                          {calendarOptions.map((opt, i) => {
                            const s = seats[opt.label];
                            return (
                              <button
                                key={opt.label}
                                type="button"
                                disabled={opt.disabled}
                                onClick={() => {
                                  haptic("tap");
                                  setDate(opt.label);
                                }}
                                className={`w-[6.75rem] shrink-0 rounded-2xl border px-2.5 py-2 text-left transition disabled:line-through disabled:opacity-40 ${
                                  date === opt.label ? "border-accent bg-accent text-white" : "border-[var(--line)] bg-bg hover:border-accent"
                                }`}
                              >
                                <span className={`block text-[0.62rem] font-semibold ${date === opt.label ? "text-white/75" : "text-muted"}`}>{i + 1}-р хөдлөх</span>
                                <span className="mt-0.5 block text-[0.7rem] font-semibold leading-snug">{formatDateRange(opt.range)}</span>
                                {s && !s.closed && s.left <= 10 ? (
                                  <span className={`mt-1 block text-[0.62rem] ${date === opt.label ? "text-white/80" : "text-[#c9964a] dark:text-[#e8b86d]"}`}>
                                    {s.left ? `${s.left} суудал` : "дүүрсэн"}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      <div className="min-w-0 rounded-2xl border border-[var(--line)] bg-bg p-3">
                        <DateRangeCalendar
                          compact
                          value={selectedRange}
                          onChange={() => {}}
                          others={calendarOptions.filter((o) => o.label !== date).map((o) => o.range)}
                          selectable={calendarOptions}
                          selectedLabel={date}
                          onSelectLabel={(label) => {
                            haptic("tap");
                            setDate(label);
                          }}
                        />
                      </div>
                    </div>
                  ) : dateOptions.length > 1 ? (
                    <div className="mt-5">
                      <p className="type-label text-muted">Огноо сонгох</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {dateOptions.map((d) => {
                          const s = seats[d];
                          return (
                            <button
                              key={d}
                              type="button"
                              disabled={s?.closed}
                              onClick={() => setDate(d)}
                              className={`min-h-11 rounded-full border px-3.5 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                                date === d ? "border-accent bg-accent text-white" : "border-[var(--line)] hover:border-accent"
                              }`}
                            >
                              {d}
                              {s && !s.closed && s.left <= 10 ? (
                                <span className={`ml-1.5 text-[0.62rem] ${date === d ? "text-white/80" : "text-[#c9964a] dark:text-[#e8b86d]"}`}>
                                  {s.left ? `${s.left} суудал` : "дүүрсэн"}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : dateOptions[0] ? (
                    <p className="mt-4 rounded-xl bg-accent-mist/60 px-3 py-2.5 text-sm">
                      <span className="text-muted">Огноо:</span> <span className="font-medium">{dateOptions[0]}</span>
                    </p>
                  ) : null}

                  {willWaitlist ? (
                    <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
                      Энэ огноонд {seatInfo.left} суудал үлдсэн тул хүсэлт тань хүлээлгийн жагсаалтад орно.
                    </p>
                  ) : null}

                  {useCalc ? (
                    <TourPriceCalculator tour={tour} state={calcState} onChange={setCalcState} quote={calcQuote} />
                  ) : (
                    <>
                      <div className="mt-5 min-w-0">
                        <div className="mb-2.5 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                              <Icon name="users" size={15} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">Аялагчид нэмэх</p>
                              <p className="text-[0.7rem] text-muted">Хэдэн хүн явах вэ?</p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-accent">{people} хүн</span>
                        </div>
                        <div className="space-y-2">
                          <Stepper label="Том хүн" hint="12-оос дээш нас" value={adults} min={1} onChange={setAdults} />
                          {ownBedAllowed ? <Stepper label="Хүүхэд, тусдаа ор" hint="2–12 нас · том хүний үнээр" value={kidsOwnBed} onChange={setKidsOwnBed} /> : null}
                          {rates.childSharedBed ? (
                            <Stepper label="Хүүхэд, хамт унтах" hint={`2–12 нас · ${formatPrice(rates.childSharedBed)}`} value={kidsSharedBed} onChange={setKidsSharedBed} />
                          ) : null}
                          {p.singleSupplement ? (
                            <Stepper label="Ганцаараа өрөө" hint={`+${formatPrice(p.singleSupplement)} / хүн`} value={singleRooms} max={adults} onChange={setSingleRooms} />
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5 rounded-xl bg-bg p-3.5 text-sm">
                        {lines.map((l) => (
                          <div key={l.label} className="flex justify-between gap-3 text-muted">
                            <span>{l.label}</span>
                            <span className="tabular-nums text-foam">{formatPrice(l.amount)}</span>
                          </div>
                        ))}
                        <div className="flex items-baseline justify-between gap-3 border-t border-[var(--line)] pt-2">
                          <span className="font-semibold">Нийт</span>
                          <AnimatedNumber value={total} format={formatPrice} className="font-num text-2xl font-semibold text-accent" />
                        </div>
                        {deposit ? (
                          <div className="flex justify-between gap-3 text-muted">
                            <span>Урьдчилгаа ({p.depositPercent}%)</span>
                            <span className="tabular-nums text-foam">{formatPrice(deposit)}</span>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </motion.div>
              ) : null}

              {stepped && step === 0 ? (
                <motion.button
                  key="next"
                  type="button"
                  disabled={!quoteReady}
                  onClick={() => {
                    if (!quoteReady) return;
                    haptic("tap");
                    setStep(1);
                    trackOnce(`contact-${tour.id}`, "booking_contact", { tour: tour.id });
                  }}
                  className="btn-shine mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-white disabled:opacity-50"
                >
                  {quoteReady ? (
                    <>
                      Үргэлжлүүлэх · <AnimatedNumber value={total} format={formatPrice} /> <Icon name="arrow-right" size={16} />
                    </>
                  ) : (
                    "Өрөөнд хуваарилж дуусгана уу"
                  )}
                </motion.button>
              ) : null}

              {!stepped || step === 1 ? (
                <motion.div key="contact" initial={stepped ? { opacity: 0, x: 24 } : false} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, transition: { duration: 0 } }} transition={{ duration: 0.25 }}>
                  {stepped ? (
                    <button type="button" onClick={() => setStep(0)} className="flex w-full items-center justify-between rounded-2xl bg-bg p-3.5 text-left">
                      <span>
                        <span className="block text-xs text-muted">{[date, `${people} хүн`].filter(Boolean).join(" · ")}</span>
                        <span className="font-num text-xl text-accent">{formatPrice(total)}</span>
                      </span>
                      <span className="text-sm font-semibold text-accent">Засах</span>
                    </button>
                  ) : null}
                  <div className="mt-4 grid gap-2" onFocusCapture={() => trackOnce(`contact-${tour.id}`, "booking_contact", { tour: tour.id })}>
                    <input required aria-label="Таны нэр" value={name} onChange={(e) => setName(e.target.value)} placeholder="Таны нэр" autoComplete="name" className="h-11 rounded-xl border border-[var(--line)] bg-bg px-3.5 text-sm outline-none transition focus:border-accent" />
                    <input required aria-label="Утасны дугаар" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Утасны дугаар" inputMode="tel" autoComplete="tel" pattern="[0-9+ ]{8,}" className="h-11 rounded-xl border border-[var(--line)] bg-bg px-3.5 text-sm outline-none transition focus:border-accent" />
                    <input tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} name="website" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Нэмэлт хүсэлт (заавал биш)" aria-label="Нэмэлт хүсэлт" rows={2} className="resize-none rounded-xl border border-[var(--line)] bg-bg px-3.5 py-2.5 text-sm outline-none transition focus:border-accent" />
                  </div>
                  {error ? <p role="alert" className="mt-3 rounded-xl bg-[#c2410c]/10 px-3 py-2 text-sm text-[#c2410c] dark:text-[#ff8f66]">{error}</p> : null}
                  <button type="submit" disabled={sending || !quoteReady} className="btn-shine mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-white transition hover:bg-accent-soft disabled:opacity-70">
                    {sending ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Илгээж байна…
                      </>
                    ) : quoteReady ? (
                      "Захиалгын хүсэлт илгээх"
                    ) : (
                      "Өрөөнд хуваарилж дуусгана уу"
                    )}
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <p className="mt-3 text-center text-[0.7rem] leading-relaxed text-muted">
              Урьдчилсан тооцоо. Эцсийн дүнг манай баг баталгаажуулна. Pocket, Toki, Simple, Dari-аар хуваан төлөх боломжтой.
            </p>
            <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
              {INSTALLMENT_PROVIDERS.map((prov) => (
                <PartnerLogo key={prov.id} id={prov.id} size={24} />
              ))}
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
