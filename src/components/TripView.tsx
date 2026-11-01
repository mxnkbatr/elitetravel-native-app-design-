"use client";

import { formatPrice, getTour } from "@/data/tours";
import { useTours } from "@/lib/content";
import { PartnerLogo } from "@/components/PartnerLogo";
import { PushPrompt } from "@/components/PushPrompt";
import { track } from "@/lib/track";
import { CareCard, ContractCard, DocumentsCard, type CareAction, type SignAction, type Upload } from "@/components/TripDocuments";
import { daysUntil } from "@/lib/dates";
import type { MrzResult } from "@/lib/mrz";
import { scanPassport } from "@/lib/passport-scan";
import { markTripSeen } from "@/lib/trip-sync";
import { useTraveller } from "@/lib/traveller-store";
import { INSTALLMENT_PROVIDERS, STATUS_LABEL, partySize, passengerIssue, progressOf, type Passenger, type Trip } from "@/lib/trips";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";

const PHONE = "+97690031771";
const INSTAGRAM_DM = "https://ig.me/m/elitetravelmn";
const STEPS = ["Хүсэлт", "Холбогдсон", "Баталгаажсан", "Төлсөн"];

type Action =
  | { action: "message"; body: string }
  | { action: "passengers"; passengers: Passenger[]; consent: boolean }
  | { action: "passengers-delete" }
  | { action: "installment"; provider: string; kind: string; phone?: string }
  | { action: "installment-cancel" }
  | CareAction
  | SignAction;

type Call = (action?: Action) => Promise<Trip | null>;
/** /api/payments/qpay/{create,status,mock-pay} */
type PayApi = (path: "create" | "status" | "mock-pay", body?: object) => Promise<void>;

const noop = () => () => {};
/** False during SSR and hydration, true after: the booking lives in localStorage. */
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

const time = (iso: string) =>
  new Intl.DateTimeFormat("mn-MN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** One booking as the traveller sees it: live status, payment, passports and a chat with the team. */
export function TripView({ id }: { id: string }) {
  const { bookings } = useTraveller();
  const local = bookings.find((b) => b.id === id);
  const token = local?.token;
  const tours = useTours();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const mounted = useHydrated();

  const call = useCallback<Call>(
    async (action) => {
      if (!token) return null;
      const res = await fetch("/api/trip", {
        method: action ? "POST" : "GET",
        headers: action ? { "x-trip-token": token, "Content-Type": "application/json" } : { "x-trip-token": token },
        body: action ? JSON.stringify(action) : undefined,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Trip & { error?: string };
      // The booking no longer exists on the server: stop asking for it
      if (res.status === 404) setGone(true);
      if (!res.ok) throw new Error(data.error ?? "Алдаа гарлаа. Дахин оролдоно уу.");
      setTrip(data);
      setError(null);
      markTripSeen(id);
      return data;
    },
    [token, id],
  );

  const pay = useCallback<PayApi>(
    async (path, body) => {
      if (!token) return;
      if (path === "create") track("pay_open", { tour: trip?.tourId });
      const res = await fetch(`/api/payments/qpay/${path}`, {
        method: "POST",
        headers: { "x-trip-token": token, "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Trip & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Алдаа гарлаа. Дахин оролдоно уу.");
      if (path === "status") setTrip(data);
      else await call();
    },
    [token, call, trip?.tourId],
  );

  const upload = useCallback<Upload>(
    async (type, slot, file, check) => {
      if (!token) return;
      const form = new FormData();
      form.set("type", type);
      form.set("slot", String(slot));
      form.set("file", file);
      if (check) form.set("check", JSON.stringify(check));
      const res = await fetch("/api/trip/documents", { method: "POST", headers: { "x-trip-token": token }, body: form, cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as Trip & { error?: string };
      if (!res.ok) throw new Error(data.error ?? (res.status === 413 ? "Файл хэт том байна." : "Хуулж чадсангүй."));
      setTrip(data);
    },
    [token],
  );

  useEffect(() => {
    if (!token || gone) return;
    const load = () => call().catch((e: Error) => setError(e.message));
    const poll = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    const t = window.setInterval(poll, 15_000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [token, gone, call]);

  const tour = getTour(tours, trip?.tourId ?? local?.tourId ?? "");

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-[calc(5.2rem+env(safe-area-inset-top))] sm:px-6 sm:pt-[calc(6.5rem+env(safe-area-inset-top))]">
      <Link href="/bookings" className="text-sm font-semibold text-accent">
        ← Миний захиалгууд
      </Link>

      {!mounted ? (
        <Skeleton />
      ) : !local ? (
        <Notice title="Захиалга олдсонгүй" body="Энэ захиалга энэ төхөөрөмж дээр хадгалагдаагүй байна. Захиалга өгсөн утсаараа нээнэ үү." />
      ) : !token ? (
        <Notice
          title="Хүсэлт системд очоогүй"
          body="Энэ хүсэлт сүлжээгүй үед үүссэн тул манай системд бүртгэгдээгүй. Instagram эсвэл утсаар холбогдож захиалгаа өгнө үү."
        />
      ) : gone ? (
        <Notice title="Захиалга олдсонгүй" body="Энэ захиалга манай системээс устгагдсан байна. Асуух зүйл байвал манай багтай холбогдоно уу." />
      ) : !trip ? (
        error ? <Notice title="Ачаалж чадсангүй" body={error} /> : <Skeleton />
      ) : (
        <div className="mt-4 space-y-4">
          <header className="overflow-hidden rounded-[1.6rem] bg-bg-elevated shadow-[0_14px_40px_rgba(6,42,42,0.10)]">
            <div className="relative h-40 sm:h-52">
              {tour ? <Image src={tour.image} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 768px" /> : null}
              <div className="absolute inset-0 bg-gradient-to-t from-[#062a2a] via-[#062a2a]/35 to-transparent" />
              <span className="absolute left-4 top-4 rounded-full bg-black/40 px-2.5 py-1 font-mono text-[0.68rem] font-semibold text-white backdrop-blur-md">{trip.id}</span>
              <Countdown date={trip.travelDate} />
              <div className="absolute inset-x-4 bottom-3 text-white">
                <p className="font-display text-2xl font-semibold leading-tight sm:text-3xl">{trip.tourTitle}</p>
                <p className="mt-0.5 text-sm text-white/75">
                  {[trip.travelDate, `${partySize(trip)} хүн`, trip.singleRooms ? `${trip.singleRooms} ганц өрөө` : ""].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <StatusBar trip={trip} />
          </header>

          {error ? <p className="rounded-xl bg-[#c2410c]/10 px-3 py-2 text-sm text-[#c2410c]">{error}</p> : null}

          {trip.status !== "cancelled" ? <PushPrompt /> : null}
          {trip.status !== "cancelled" ? <PaySection trip={trip} call={call} pay={pay} /> : null}
          <Chat trip={trip} call={call} />
          {trip.status !== "cancelled" && trip.status !== "waitlist" ? (
            <>
              <Passengers trip={trip} call={call} />
              <DocumentsCard trip={trip} upload={upload} />
              <CareCard trip={trip} call={call} />
              <ContractCard trip={trip} call={call} />
            </>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${PHONE}`} className="flex h-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-bg-elevated text-sm font-semibold">
              ☏ Залгах
            </a>
            <a href={INSTAGRAM_DM} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-bg-elevated text-sm font-semibold">
              Instagram
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Countdown({ date }: { date: string | null }) {
  const days = useHydrated() ? daysUntil(date ?? undefined) : null;
  if (days == null || days < 0) return null;
  return (
    <div className="absolute right-4 top-4 rounded-2xl bg-white/95 px-3 py-1.5 text-center">
      <p className="font-num text-2xl leading-none text-ink">{days}</p>
      <p className="text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-muted">{days === 0 ? "өнөөдөр" : "хоног"}</p>
    </div>
  );
}

function StatusBar({ trip }: { trip: Trip }) {
  if (trip.status === "cancelled" || trip.status === "waitlist") {
    return (
      <div className={`px-4 py-3.5 text-sm font-semibold ${trip.status === "cancelled" ? "bg-zinc-100 text-zinc-600" : "bg-amber-50 text-amber-800"}`}>
        {trip.status === "cancelled" ? "Захиалга цуцлагдсан" : "Хүлээлгийн жагсаалтад байна — суудал гармагц мэдэгдэнэ"}
      </div>
    );
  }
  const done = progressOf(trip.status, trip.paidAmount, trip.total);
  return (
    <ol className="grid grid-cols-4 gap-1.5 px-4 py-3.5">
      {STEPS.map((s, i) => (
        <li key={s}>
          <div className={`h-1.5 rounded-full ${i < done ? "bg-accent" : "bg-[var(--line)]"}`} />
          <p className={`mt-1.5 text-[0.65rem] leading-tight ${i < done ? "font-semibold text-accent" : "text-muted"}`}>{s}</p>
        </li>
      ))}
    </ol>
  );
}

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

function PaySection({ trip, call, pay }: { trip: Trip; call: Call; pay: PayApi }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const remaining = Math.max(0, trip.total - trip.paidAmount);
  const canPay = trip.payOptions.length > 0 && trip.qpay !== "off";

  async function openInvoice(kind: string) {
    setBusy(kind);
    setError(null);
    try {
      await pay("create", { kind });
      setSheet(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function run(key: string, action: Action) {
    setBusy(key);
    setError(null);
    try {
      await call(action);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card title="Төлбөр" aside={<span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${trip.status === "paid" ? "bg-teal-600 text-white" : "bg-accent-mist text-accent"}`}>{STATUS_LABEL[trip.status]}</span>}>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted">Нийт</dt>
          <dd className="font-num text-lg">{formatPrice(trip.total)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Төлсөн</dt>
          <dd className="font-num text-lg text-accent">{formatPrice(trip.paidAmount)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-muted">Үлдэгдэл</dt>
          <dd className="font-num text-lg">{formatPrice(remaining)}</dd>
        </div>
      </dl>
      {trip.total > 0 ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--line)]">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, (trip.paidAmount / trip.total) * 100)}%` }} />
        </div>
      ) : null}

      {canPay ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {trip.payOptions.map((o) => (
            <button
              key={o.kind}
              type="button"
              disabled={busy != null}
              onClick={() => openInvoice(o.kind)}
              className={`flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
                o.kind === "full" && trip.payOptions.length > 1 ? "border border-accent text-accent" : "bg-accent text-white"
              }`}
            >
              {busy === o.kind ? "Нэхэмжлэх үүсгэж байна…" : `QPay · ${o.label} ${formatPrice(o.amount)}`}
            </button>
          ))}
        </div>
      ) : trip.payOptions.length ? (
        <p className="mt-4 rounded-xl bg-bg px-3 py-2.5 text-sm text-muted">Онлайн төлбөр түр ажиллахгүй байна. Хуваан төлөх эсвэл чатаар төлбөрийн мэдээлэл асуугаарай.</p>
      ) : null}
      {canPay && trip.paidAmount === 0 ? <p className="mt-2 text-xs text-muted">Төлбөр орж ирмэгц захиалга автоматаар баталгаажиж, И-баримт гарна.</p> : null}
      {trip.invoice && !sheet ? (
        <button type="button" onClick={() => setSheet(true)} className="mt-3 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-left text-sm">
          <span className="font-semibold text-ink">Нээлттэй нэхэмжлэх · {formatPrice(trip.invoice.amount)}</span>
          <span className="block text-xs text-accent">QR болон банкны апп харах →</span>
        </button>
      ) : null}

      {trip.installment ? (
        <InstallmentStatus trip={trip} busy={busy != null} onCancel={() => run("cancel", { action: "installment-cancel" })} />
      ) : trip.payOptions.length && trip.installments.length ? (
        <InstallmentPicker trip={trip} busy={busy != null} onSubmit={(a) => run("installment", a)} />
      ) : null}

      {trip.receipts.length ? <Receipts trip={trip} /> : null}
      {error ? <p className="mt-3 text-sm text-[#c2410c]">{error}</p> : null}

      <PaySheet open={sheet && trip.invoice != null} trip={trip} pay={pay} onClose={() => setSheet(false)} />
    </Card>
  );
}

/** iOS-style bottom sheet on phones (centred dialog on desktop): QR, bank / wallet deeplinks, live status. */
function PaySheet({ open, trip, pay, onClose }: { open: boolean; trip: Trip; pay: PayApi; onClose: () => void }) {
  const [watching, setWatching] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invoice = trip.invoice;
  if (open && invoice && watching !== invoice.id) setWatching(invoice.id);
  const paid = watching != null && invoice?.id !== watching;

  // The callback may never arrive: ask the server (which asks QPay) every few seconds while the sheet is open
  useEffect(() => {
    if (!watching || paid) return;
    let n = 0;
    const t = window.setInterval(() => {
      if (++n > 75 || document.visibilityState !== "visible") return;
      pay("status").catch(() => {});
    }, 4000);
    return () => window.clearInterval(t);
  }, [watching, paid, pay]);

  useEffect(() => {
    if (!paid) return;
    const t = window.setTimeout(() => {
      setWatching(null);
      onClose();
    }, 2600);
    return () => window.clearTimeout(t);
  }, [paid, onClose]);

  async function check(path: "status" | "mock-pay") {
    setChecking(true);
    setError(null);
    try {
      await pay(path, path === "mock-pay" ? { paymentId: invoice?.id } : undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }

  const visible = open || paid;
  // Portalled: the page transition wrapper is transformed, which would trap the sheet under the dock
  return createPortal(
    <AnimatePresence>
      {visible ? (
        <motion.div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Хаах" onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
          <motion.div
            role="dialog"
            aria-label="QPay төлбөр"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-bg-elevated px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-20px_60px_rgba(0,0,0,0.25)] sm:max-w-md sm:rounded-[1.75rem] sm:pb-6"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--line)]" />
            {paid ? (
              <div className="py-10 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16 }}
                  className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-3xl text-white"
                >
                  ✓
                </motion.div>
                <p className="mt-4 font-display text-2xl font-semibold">Төлбөр амжилттай</p>
                <p className="mt-1 text-sm text-muted">Захиалга шинэчлэгдэж, И-баримт гарлаа.</p>
              </div>
            ) : invoice ? (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-2xl font-semibold">QPay-ээр төлөх</p>
                  <p className="font-num text-xl text-accent">{formatPrice(invoice.amount)}</p>
                </div>

                <div className="mt-4 rounded-2xl bg-white p-4 text-center">
                  {invoice.qrImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`data:image/png;base64,${invoice.qrImage}`} alt="QPay QR" className="mx-auto size-56" />
                  ) : (
                    <div className="mx-auto grid size-56 place-items-center rounded-xl border-2 border-dashed border-[var(--line)] text-xs font-semibold text-muted">
                      {invoice.mock ? "ТУРШИЛТЫН QR (mock)" : "QR ачаалж чадсангүй"}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted">Өөр утас эсвэл компьютерээс төлж байгаа бол банкны аппаараа QR уншуулна уу.</p>
                </div>

                {invoice.urls.length ? (
                  <>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Энэ утаснаас төлөх</p>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {invoice.urls.map((u) => (
                        <a key={u.name + u.link} href={u.link} className="flex flex-col items-center gap-1 rounded-2xl p-1.5 text-center text-[0.62rem] leading-tight text-muted active:scale-95">
                          {u.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.logo} alt="" className="size-12 rounded-2xl" />
                          ) : (
                            <span className="grid size-12 place-items-center rounded-2xl bg-bg font-semibold text-ink">{u.name.charAt(0)}</span>
                          )}
                          <span className="line-clamp-2">{u.description ?? u.name}</span>
                        </a>
                      ))}
                    </div>
                  </>
                ) : null}

                <div className="mt-4 rounded-2xl bg-accent-mist/60 px-4 py-3 text-xs leading-relaxed text-ink">
                  <p className="font-semibold">Хуваан төлөх бол</p>
                  {/* TODO(confirm with provider): Toki PayLater through a QPay QR reaching us as PAID is unconfirmed;
                      Pocket, Simple and Dari support for QPay QR is unconfirmed, so they are not mentioned here. */}
                  <p className="mt-0.5">Toki аппаар энэ QR-ийг уншуулаад PayLater сонгоно. Хуваах хугацаа, нөхцөлийг Toki тогтооно.</p>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
                  <span className="size-2 animate-pulse rounded-full bg-accent" />
                  Төлбөрийг автоматаар шалгаж байна…
                </div>
                <div className="mt-3 grid gap-2">
                  <button type="button" disabled={checking} onClick={() => check("status")} className="h-11 rounded-2xl bg-bg text-sm font-semibold text-accent disabled:opacity-60">
                    {checking ? "Шалгаж байна…" : "Төлсөн эсэхийг шалгах"}
                  </button>
                  {invoice.mock ? (
                    <button type="button" disabled={checking} onClick={() => check("mock-pay")} className="h-11 rounded-2xl border border-dashed border-amber-400 text-sm font-semibold text-amber-700 disabled:opacity-60">
                      Туршилт: төлсөнд тооцох (mock)
                    </button>
                  ) : null}
                  <button type="button" onClick={onClose} className="h-10 text-sm font-semibold text-muted">
                    Дараа төлөх
                  </button>
                </div>
                {error ? <p className="mt-2 text-center text-sm text-[#c2410c]">{error}</p> : null}
              </>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function Receipts({ trip }: { trip: Trip }) {
  return (
    <div className="mt-4 border-t border-[var(--line)] pt-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">И-баримт</p>
      <ul className="mt-2 space-y-1.5">
        {trip.receipts.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-2 text-xs">
            <span className="font-num text-sm text-ink">{formatPrice(r.amount)}</span>
            <span className="text-right text-muted">
              {r.status === "issued" ? (
                <>
                  {r.mock ? <span className="font-semibold text-amber-700">Туршилтын баримт · </span> : null}
                  <span className="font-mono">{r.billId}</span>
                  {r.lottery ? <span className="block">Сугалаа: {r.lottery}</span> : null}
                </>
              ) : (
                "Баримт бэлтгэгдэж байна"
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const providerName = (id: string) => INSTALLMENT_PROVIDERS.find((p) => p.id === id)?.name ?? id;

function InstallmentStatus({ trip, busy, onCancel }: { trip: Trip; busy: boolean; onCancel: () => void }) {
  const r = trip.installment!;
  const name = providerName(r.provider);
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-white p-4">
      <PartnerLogo id={r.provider} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          {name}-ээр хуваан төлөх · {formatPrice(r.amount)}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          {r.sent
            ? `${name} апп руу нэхэмжлэх илгээгдлээ. Аппаа нээж баталгаажуулна уу — баталгаажмагц энд «Төлсөн» болно.`
            : `Хүсэлт илгээгдсэн. Манай ажилтан ${r.phone ?? "таны"} дугаарт ${name} нэхэмжлэх илгээнэ.`}
        </p>
        {!r.sent ? (
          <button type="button" disabled={busy} onClick={onCancel} className="mt-2 text-xs font-semibold text-[#c2410c] disabled:opacity-60">
            Хүсэлт цуцлах
          </button>
        ) : null}
      </div>
    </div>
  );
}

function InstallmentPicker({ trip, busy, onSubmit }: { trip: Trip; busy: boolean; onSubmit: (a: Action) => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(trip.payOptions[0].kind);
  const [provider, setProvider] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const amount = trip.payOptions.find((o) => o.kind === kind)?.amount ?? 0;
  const fitting = trip.installments.filter((p) => (p.min == null || amount >= p.min) && (p.max == null || amount <= p.max));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-between rounded-2xl border border-dashed border-[var(--line)] px-4 py-3 text-left text-sm active:scale-[0.99]"
      >
        <span>
          <span className="font-semibold text-ink">Хуваан төлөх</span>
          <span className="block text-xs text-muted">{trip.installments.map((p) => p.name).join(", ")}</span>
        </span>
        <span className="flex -space-x-2">
          {trip.installments.map((p) => (
            <PartnerLogo key={p.id} id={p.id} size={32} className="ring-2 ring-white" />
          ))}
        </span>
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white p-4">
      <p className="text-sm font-semibold text-ink">Хуваан төлөх</p>
      {trip.payOptions.length > 1 ? (
        <div className="mt-2 flex gap-2">
          {trip.payOptions.map((o) => (
            <button
              key={o.kind}
              type="button"
              onClick={() => setKind(o.kind)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${kind === o.kind ? "bg-accent text-white" : "bg-bg text-muted"}`}
            >
              {o.label} · {formatPrice(o.amount)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 grid gap-2">
        {fitting.length === 0 ? <p className="text-xs text-muted">Энэ дүнд тохирох хуваан төлөх сонголт алга.</p> : null}
        {fitting.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProvider(p.id)}
            className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${provider === p.id ? "border-accent ring-2 ring-accent/15" : "border-[var(--line)]"}`}
          >
            <PartnerLogo id={p.id} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{p.name}</span>
              {p.terms ? <span className="block text-xs text-muted">{p.terms}</span> : null}
            </span>
          </button>
        ))}
      </div>
      {provider ? (
        <>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder={`${providerName(provider)}-д бүртгэлтэй утас (захиалгынхаас өөр бол)`}
            className="mt-3 h-11 w-full rounded-xl border border-[var(--line)] bg-bg px-3 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => onSubmit({ action: "installment", provider, kind, phone: phone.trim() || undefined })}
            className="mt-2 h-12 w-full rounded-2xl bg-ink text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Илгээж байна…" : `${providerName(provider)}-ээр ${formatPrice(amount)} хүсэлт илгээх`}
          </button>
        </>
      ) : null}
      <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full text-xs font-semibold text-muted">
        Болих
      </button>
    </div>
  );
}

function Chat({ trip, call }: { trip: Trip; call: Call }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [trip.messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await call({ action: "message", body });
      setText("");
      // The AI assistant answers within seconds; check sooner than the regular poll
      for (const ms of [6_000, 14_000]) window.setTimeout(() => void call().catch(() => {}), ms);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card title="Elite Travel багтай чатлах">
      <div ref={box} className="max-h-[22rem] space-y-2 overflow-y-auto overscroll-contain rounded-2xl bg-bg p-3">
        {trip.messages.length === 0 ? <p className="py-6 text-center text-sm text-muted">Асуух зүйлээ энд бичээрэй.</p> : null}
        {trip.messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === "traveller" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${
                m.sender === "traveller"
                  ? "rounded-br-md bg-accent text-white"
                  : m.sender === "system"
                    ? "rounded-bl-md bg-accent-mist text-ink"
                    : "rounded-bl-md bg-white text-ink shadow-sm"
              }`}
            >
              {m.sender !== "traveller" ? (
                <p className="mb-0.5 text-[0.65rem] font-semibold text-accent">
                  {m.sender === "staff" ? "Elite Travel" : m.body.startsWith("🤖") ? "🤖 AI туслах" : "Мэдэгдэл"}
                </p>
              ) : null}
              {m.body.startsWith("🤖") ? m.body.replace(/^🤖\s*/u, "") : m.body}
              <p className={`mt-1 text-right text-[0.6rem] ${m.sender === "traveller" ? "text-white/70" : "text-muted"}`}>{time(m.at)}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Мессеж бичих…"
          maxLength={2000}
          className="h-12 min-w-0 flex-1 rounded-2xl border border-[var(--line)] bg-bg px-4 text-sm outline-none focus:border-accent"
        />
        <button type="submit" disabled={sending || !text.trim()} className="h-12 rounded-2xl bg-accent px-5 text-sm font-semibold text-white disabled:opacity-50">
          {sending ? "…" : "Илгээх"}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-[#c2410c]">{error}</p> : null}
    </Card>
  );
}

const fieldClass = "h-11 w-full rounded-xl border border-[var(--line)] bg-bg px-3 text-sm outline-none focus:border-accent";

function Passengers({ trip, call }: { trip: Trip; call: Call }) {
  const count = partySize(trip);
  const [rows, setRows] = useState<Passenger[]>(() => Array.from({ length: count }, (_, i) => trip.passengers[i] ?? { name: "" }));
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(trip.passportConsent);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const ready = rows.filter((p) => !passengerIssue(p, trip.travelDate)).length;

  const update = (i: number, patch: Partial<Passenger>) => setRows((all) => all.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await call({ action: "passengers", passengers: rows, consent });
      setMessage({ ok: true, text: "Шифрлэгдэн хадгалагдлаа." });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm("Бүх зорчигчийн паспортын мэдээллийг устгах уу?")) return;
    setSaving(true);
    setMessage(null);
    try {
      await call({ action: "passengers-delete" });
      setRows(Array.from({ length: count }, () => ({ name: "" })));
      setConsent(false);
      setMessage({ ok: true, text: "Устгагдлаа." });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Зорчигчид" aside={<span className="text-xs font-semibold text-muted">{ready}/{count} бэлэн</span>}>
      <p className="mb-3 text-xs leading-relaxed text-muted">Паспорт дээрх шиг латин үсгээр бичнэ. Паспорт аяллаас хойш 6 сараас дээш хүчинтэй байх шаардлагатай.</p>
      <div className="space-y-3">
        {rows.map((p, i) => {
          const issue = passengerIssue(p, trip.travelDate);
          return (
            <div key={i} className="rounded-2xl bg-bg p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Зорчигч {i + 1}</p>
                <span className={`text-[0.7rem] font-semibold ${issue ? "text-[#c2410c]" : "text-accent"}`}>{issue ?? "✓ Бэлэн"}</span>
              </div>
              <ScanButton
                onResult={(r) =>
                  update(i, {
                    name: r.name || p.name,
                    gender: r.gender ?? p.gender,
                    birth: r.birth ?? p.birth,
                    passport: r.passport || p.passport,
                    expiry: r.expiry ?? p.expiry,
                  })
                }
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={p.name}
                  onChange={(e) => update(i, { name: e.target.value.toUpperCase().replace(/[^A-Z .'-]/g, "") })}
                  placeholder="ОВОГ НЭР (латинаар)"
                  autoCapitalize="characters"
                  className={`${fieldClass} sm:col-span-2`}
                />
                <select value={p.gender ?? ""} onChange={(e) => update(i, { gender: (e.target.value || undefined) as Passenger["gender"] })} className={fieldClass}>
                  <option value="">Хүйс</option>
                  <option value="M">Эрэгтэй</option>
                  <option value="F">Эмэгтэй</option>
                </select>
                <label className="relative">
                  <span className="pointer-events-none absolute left-3 top-1 text-[0.6rem] text-muted">Төрсөн огноо</span>
                  <input type="date" value={p.birth ?? ""} onChange={(e) => update(i, { birth: e.target.value || undefined })} className={`${fieldClass} pt-3`} />
                </label>
                <input
                  value={p.passport ?? ""}
                  onChange={(e) => update(i, { passport: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") || undefined })}
                  placeholder="Паспортын дугаар"
                  autoCapitalize="characters"
                  className={fieldClass}
                />
                <label className="relative">
                  <span className="pointer-events-none absolute left-3 top-1 text-[0.6rem] text-muted">Паспорт дуусах</span>
                  <input type="date" value={p.expiry ?? ""} onChange={(e) => update(i, { expiry: e.target.value || undefined })} className={`${fieldClass} pt-3`} />
                </label>
              </div>
            </div>
          );
        })}
      </div>
      {!trip.passportStorage ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Паспортын мэдээлэл хадгалах тохиргоо хийгдээгүй байна. Түр хүлээнэ үү эсвэл манай багтай холбогдоно уу.</p>
      ) : null}
      <label className="mt-3 flex items-start gap-2.5 rounded-xl bg-bg p-3 text-xs leading-relaxed text-ink">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[#0d8f84]" />
        <span>
          Зорчигчдын паспортын мэдээллийг нислэг, буудал, даатгал, визийн бүрдүүлэлтэд ашиглуулахаар Elite Travel-д өгөхийг зөвшөөрч байна. Мэдээлэл шифрлэгдэн хадгалагдах
          бөгөөд хүссэн үедээ эндээс устгаж болно.
        </span>
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !consent || !trip.passportStorage}
          className="h-11 rounded-2xl bg-accent px-6 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Хадгалж байна…" : "Хадгалах"}
        </button>
        {message ? <p className={`text-sm ${message.ok ? "text-accent" : "text-[#c2410c]"}`}>{message.text}</p> : null}
        {trip.passengers.length ? (
          <button type="button" onClick={remove} disabled={saving} className="ml-auto text-xs font-semibold text-[#c2410c] disabled:opacity-50">
            Паспортын мэдээллээ устгах
          </button>
        ) : null}
      </div>
    </Card>
  );
}

/** Fills a passenger from a photo of the passport's machine-readable zone; the photo stays on the device. */
function ScanButton({ onResult }: { onResult: (r: MrzResult) => void }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setMessage(null);
    const out = await scanPassport(file, setProgress);
    setBusy(false);
    if (out.ok) {
      onResult(out.result);
      setMessage(
        out.result.valid
          ? { ok: true, text: "✓ Паспорт уншигдлаа. Мэдээллээ шалгаад хадгална уу." }
          : { ok: false, text: "Уншигдлаа, гэхдээ зарим тэмдэгт эргэлзээтэй байна — доорх талбаруудыг шалгаж засаарай." },
      );
    } else {
      setMessage({
        ok: false,
        text:
          out.reason === "no-mrz"
            ? "Паспортын доод 2 мөр олдсонгүй. Гэрэлтэй газар, паспортоо хавтгай тавьж, доод мөрүүд бүтэн харагдахаар дахин зургаа авна уу."
            : "Уншиж чадсангүй. Интернэтээ шалгаад дахин оролдох эсвэл гараар бөглөнө үү.",
      });
    }
  }

  return (
    <div className="mb-2">
      <label
        className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-accent/50 bg-white text-sm font-semibold text-accent transition active:scale-[0.99] ${
          busy ? "pointer-events-none opacity-70" : ""
        }`}
      >
        {busy ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            {progress ? `Уншиж байна… ${progress}%` : "Бэлтгэж байна…"}
          </>
        ) : (
          <>📷 Паспортын зургаар бөглөх</>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {message ? (
        <p className={`mt-1.5 text-[0.7rem] leading-relaxed ${message.ok ? "text-accent" : "text-[#c2410c]"}`}>{message.text}</p>
      ) : (
        <p className="mt-1.5 text-[0.65rem] text-muted">Зургийн хуудасны доод 2 мөр бүтэн, тод харагдахаар. Зураг таны утаснаас гарахгүй.</p>
      )}
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6 rounded-[1.6rem] border border-dashed border-[var(--line)] bg-bg-elevated px-6 py-12 text-center">
      <p className="font-display text-2xl font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{body}</p>
      <div className="mt-5 flex justify-center gap-2">
        <a href={INSTAGRAM_DM} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white">
          Instagram
        </a>
        <a href={`tel:${PHONE}`} className="inline-flex h-11 items-center rounded-full border border-[var(--line)] px-5 text-sm font-semibold">
          Залгах
        </a>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mt-4 space-y-4">
      <div className="h-56 animate-pulse rounded-[1.6rem] bg-bg-elevated" />
      <div className="h-36 animate-pulse rounded-[1.4rem] bg-bg-elevated" />
      <div className="h-64 animate-pulse rounded-[1.4rem] bg-bg-elevated" />
    </div>
  );
}
