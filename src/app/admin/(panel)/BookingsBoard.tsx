"use client";

import { Icon } from "@/components/Icon";
import { AdminEmpty } from "@/app/admin/(panel)/AdminEmpty";
import { confirmAction, toast } from "@/app/admin/(panel)/feedback";
import { adminDeletePassengers, getThread, recordPayment, sendStaffMessage, updateBooking, viewPassengers } from "@/app/admin/(panel)/actions";
import { DocsPanel } from "@/app/admin/(panel)/DocsPanel";
import { InstallmentActions } from "@/app/admin/(panel)/payments/InstallmentActions";
import { Sheet } from "@/components/Sheet";
import { formatPrice } from "@/data/tours";
import { passengerIssue, STATUS_LABEL, type InstallmentRequest, type Passenger, type TripMessage, type TripStatus } from "@/lib/trips";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

export type AdminBooking = {
  id: string;
  created_at: string;
  tour_id: string;
  tour_title: string;
  travel_date: string | null;
  name: string;
  phone: string;
  adults: number;
  kids_own_bed: number;
  kids_shared_bed: number;
  single_rooms: number;
  total: number;
  deposit: number;
  paid_amount: number;
  note: string | null;
  status: TripStatus;
  staff_note: string | null;
  source: string;
  passengers_count: number;
  passengers_ready: number;
};

const STATUSES: { key: TripStatus; label: string; tone: string; hint: string }[] = [
  { key: "new", label: "Шинэ", tone: "bg-sky-100 text-sky-800", hint: "Хүсэлт ирсэн, холбогдоогүй" },
  { key: "contacted", label: "Холбогдсон", tone: "bg-amber-100 text-amber-800", hint: "Залгаж ярьсан" },
  { key: "confirmed", label: "Баталгаажсан", tone: "bg-emerald-100 text-emerald-800", hint: "Аялагчид мэдэгдэл, төлбөрийн заавар очно" },
  { key: "paid", label: "Төлсөн", tone: "bg-teal-600 text-white", hint: "Бүрэн төлөгдсөн" },
  { key: "waitlist", label: "Хүлээлэг", tone: "bg-violet-100 text-violet-800", hint: "Суудал гармагц автоматаар идэвхжинэ" },
  { key: "cancelled", label: "Цуцалсан", tone: "bg-zinc-200 text-zinc-600", hint: "Суудал чөлөөлөгдөнө" },
];

// Fixed zone and digits: the server's and the browser's mn-MN data differ (XI/03 vs 11/03), which broke hydration
const WHEN = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ulaanbaatar", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const when = (iso: string) => WHEN.format(new Date(iso)).replace(",", "");

type Filter = TripStatus | "all" | "unread" | "docs";

/** What the signed-in staff member may do on this board (the server checks again). */
export type BoardPerms = { manage: boolean; money: boolean; passports: boolean };

function FilterChip({ active, label, n, alert, onClick }: { active: boolean; label: string; n: number; alert?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition active:scale-[0.97] lg:flex-col-reverse lg:items-start lg:gap-1.5 lg:rounded-[1.25rem] lg:p-4 ${
        active ? "admin-glow border-accent bg-accent/[0.14] text-accent" : "border-[var(--line)] bg-white text-ink hover:border-accent/40"
      }`}
    >
      <span className={`lg:text-xs ${active ? "lg:text-accent" : "lg:text-muted"}`}>{label}</span>
      <span className={`font-num tabular-nums lg:text-3xl lg:leading-none ${alert && n ? "text-red-600" : active ? "text-accent" : "text-muted lg:text-ink"}`}>
        {n}
      </span>
    </button>
  );
}

export function BookingsBoard({
  bookings,
  unread: initialUnread,
  stale,
  installments,
  perms,
  initialQuery = "",
  initialFilter,
  docs = [],
}: {
  /** Bookings with documents waiting for review */
  docs?: string[];
  bookings: AdminBooking[];
  unread: string[];
  stale: string[];
  installments: Record<string, InstallmentRequest>;
  perms: BoardPerms;
  /** From `/admin?q=…`, e.g. a tapped push notification */
  initialQuery?: string;
  /** From `/admin?f=unread|new|…`, the «today» shortcuts */
  initialFilter?: string;
}) {
  const [rows, setRows] = useState(bookings);
  const [unread, setUnread] = useState(() => new Set(initialUnread));
  const [filter, setFilter] = useState<Filter>(() =>
    initialFilter === "unread" || initialFilter === "docs" || STATUSES.some((s) => s.key === initialFilter) ? (initialFilter as Filter) : "all",
  );
  const [q, setQ] = useState(initialQuery);

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s.key, rows.filter((r) => r.status === s.key).length])), [rows]);
  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || (filter === "unread" ? unread.has(r.id) : filter === "docs" ? docs.includes(r.id) : r.status === filter)) &&
        (!query || `${r.id} ${r.name} ${r.phone} ${r.tour_title}`.toLowerCase().includes(query)),
    );
  }, [rows, filter, q, unread, docs]);

  const patch = (id: string, change: Partial<AdminBooking>) => setRows((all) => all.map((r) => (r.id === id ? { ...r, ...change } : r)));
  const markRead = (id: string) =>
    setUnread((s) => {
      if (!s.has(id)) return s;
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  const pick = (f: Filter) => setFilter(filter === f ? "all" : f);

  return (
    <div className="mt-5">
      <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 lg:grid lg:grid-cols-8 lg:gap-3">
        <FilterChip active={filter === "all"} label="Бүгд" n={rows.length} onClick={() => setFilter("all")} />
        <FilterChip active={filter === "unread"} label="Хариулаагүй" n={unread.size} alert onClick={() => pick("unread")} />
        {docs.length ? <FilterChip active={filter === "docs"} label="Шалгах баримт" n={docs.length} alert onClick={() => pick("docs")} /> : null}
        {STATUSES.map((s) => (
          <FilterChip key={s.key} active={filter === s.key} label={s.label} n={counts[s.key]} onClick={() => pick(s.key)} />
        ))}
      </div>

      <div className="sticky top-[calc(3.55rem+env(safe-area-inset-top))] z-20 -mx-4 mt-2 bg-bg/90 px-4 py-2.5 backdrop-blur-xl lg:static lg:mx-0 lg:mt-4 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
        <label className="flex h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 focus-within:border-accent sm:max-w-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Нэр, утас, код, аялал…" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none" />
          {q ? (
            <button type="button" onClick={() => setQ("")} className="text-muted" aria-label="Цэвэрлэх">
              ×
            </button>
          ) : null}
        </label>
      </div>

      <div className="mt-2 space-y-3">
        {shown.length === 0 ? <AdminEmpty icon="ticket" title="Энд хүсэлт алга" body="Шүүлтүүрээ «Бүгд» болгох эсвэл хайлтаа цэвэрлээд үзээрэй." /> : null}
        {shown.map((b) => (
          <BookingRow
            key={b.id}
            b={b}
            unread={unread.has(b.id)}
            stale={b.status === "new" && stale.includes(b.id)}
            installment={installments[b.id]}
            perms={perms}
            onChange={(c) => patch(b.id, c)}
            onRead={() => markRead(b.id)}
          />
        ))}
      </div>
    </div>
  );
}

function BookingRow({
  b,
  unread,
  stale,
  installment,
  perms,
  onChange,
  onRead,
}: {
  b: AdminBooking;
  unread: boolean;
  stale: boolean;
  installment?: InstallmentRequest;
  perms: BoardPerms;
  onChange: (c: Partial<AdminBooking>) => void;
  onRead: () => void;
}) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState(b.staff_note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"status" | "chat" | "money" | "people" | "docs" | null>(null);
  const status = STATUSES.find((s) => s.key === b.status) ?? STATUSES[0];
  const kids = b.kids_own_bed + b.kids_shared_bed;
  const people = b.adults + kids;
  const ready = b.passengers_ready;

  function save(change: { status?: TripStatus; staffNote?: string }) {
    setError(null);
    const before = { status: b.status, staff_note: b.staff_note };
    if (change.status) onChange({ status: change.status });
    if (change.staffNote !== undefined) onChange({ staff_note: change.staffNote });
    start(async () => {
      const res = await updateBooking(b.id, change);
      if (!res.ok) {
        onChange(before);
        setError(res.error);
        toast(res.error, "error");
      } else if (change.status) toast(`${b.id} · ${STATUS_LABEL[change.status]}`);
      else toast("Тэмдэглэл хадгалагдлаа");
    });
  }

  const open = (s: NonNullable<typeof sheet>) => {
    setSheet(s);
    if (s === "chat") onRead();
  };
  const close = () => setSheet(null);

  return (
    <article
      className={`rounded-[1.4rem] border bg-white p-4 shadow-[0_8px_24px_rgba(6,42,42,0.04)] transition sm:p-5 ${b.status === "cancelled" ? "opacity-60" : ""} ${
        unread ? "border-red-300 ring-2 ring-red-100" : stale ? "border-amber-300" : "border-[var(--line)]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${status.tone}`}>{status.label}</span>
        {unread ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-[0.65rem] font-bold text-white">Шинэ мессеж</span> : null}
        {stale ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-800">2+ цаг хариугүй</span> : null}
        <span className="ml-auto shrink-0 text-xs text-muted">{when(b.created_at)}</span>
      </div>

      <div className="mt-3 sm:flex sm:items-start sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{b.tour_title}</p>
          <p className="mt-0.5 text-sm text-muted">
            {b.travel_date ?? "Огноо сонгоогүй"} · {b.adults} том хүн{kids ? `, ${kids} хүүхэд` : ""}
            {b.single_rooms ? ` · ${b.single_rooms} ганц өрөө` : ""}
          </p>
          <p className="mt-0.5 font-mono text-[0.7rem] text-muted">
            {b.id}
            {b.source !== "web" ? ` · ${b.source}` : ""}
          </p>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-bg px-3 py-2.5 sm:mt-0 sm:block sm:bg-transparent sm:p-0 sm:text-right">
          <div className="flex items-center gap-2.5 sm:block">
            <span className="grid size-9 place-items-center rounded-full bg-[#062a2a] text-sm font-semibold text-[#f3e0c2] sm:hidden">{b.name.charAt(0).toUpperCase()}</span>
            <div>
              <p className="text-sm font-semibold">{b.name}</p>
              <a href={`tel:${b.phone.replace(/\s/g, "")}`} className="text-sm font-semibold text-accent">
                {b.phone}
              </a>
            </div>
          </div>
          <div className="text-right sm:mt-2">
            <p className="font-num text-lg leading-tight">{formatPrice(b.total)}</p>
            <p className="text-[0.7rem] text-muted">
              {b.paid_amount ? <span className="font-semibold text-emerald-700">Төлсөн {formatPrice(b.paid_amount)}</span> : b.deposit ? `Урьдч. ${formatPrice(b.deposit)}` : null}
            </p>
          </div>
        </div>
      </div>

      {b.note ? <p className="mt-3 rounded-xl bg-bg px-3 py-2 text-sm"><Icon name="chat" size={14} className="mr-1.5 inline -mt-0.5 text-muted" />{b.note}</p> : null}

      {installment ? (
        <div className="mt-3 rounded-xl border border-dashed border-[var(--line)] px-3 py-2">
          <InstallmentActions
            r={installment}
            onDone={(paid) => {
              if (!paid) return;
              const sum = b.paid_amount + installment.amount;
              onChange({ paid_amount: sum, status: sum >= b.total ? "paid" : b.status === "cancelled" ? b.status : "confirmed" });
            }}
          />
        </div>
      ) : null}

      {/* Desktop: status chips and note inline */}
      <div className={`mt-4 hidden flex-wrap items-center gap-2 border-t border-[var(--line)] pt-4 ${perms.manage ? "sm:flex" : ""}`}>
        {STATUSES.map((s) => (
          <button
            key={s.key}
            type="button"
            disabled={pending || s.key === b.status}
            onClick={() => save({ status: s.key })}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${s.key === b.status ? s.tone : "bg-bg text-muted hover:bg-accent/10 hover:text-accent"}`}
          >
            {s.label}
          </button>
        ))}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (b.staff_note ?? "") && save({ staffNote: note })}
          placeholder="Ажилтны тэмдэглэл…"
          maxLength={1000}
          className="h-9 min-w-[12rem] flex-1 rounded-full border border-[var(--line)] px-3.5 text-sm outline-none focus:border-accent"
        />
      </div>
      {b.staff_note ? <p className="mt-2 text-xs text-muted sm:hidden"><Icon name="news" size={14} className="mr-1.5 inline -mt-0.5 text-muted" />{b.staff_note}</p> : null}
      {pending ? <p className="mt-2 text-xs text-muted">Хадгалж байна…</p> : null}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-[var(--line)] pt-3 sm:mt-3 sm:flex sm:border-0 sm:pt-0">
        {perms.manage ? (
          <button type="button" onClick={() => open("status")} className="col-span-4 flex h-11 items-center justify-between rounded-2xl bg-bg px-4 text-sm font-semibold sm:hidden">
            <span className="text-muted">Төлөв</span>
            <span className="flex items-center gap-1.5">
              <span className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${status.tone}`}>{status.label}</span>›
            </span>
          </button>
        ) : null}
        <ActionButton href={`tel:${b.phone.replace(/\s/g, "")}`} label="Залгах" className="sm:hidden">
          <Icon name="phone" size={18} />
        </ActionButton>
        <ActionButton onClick={() => open("chat")} label="Чат" alert={unread}>
          <Icon name="chat" size={18} />
        </ActionButton>
        {perms.money ? (
          <ActionButton onClick={() => open("money")} label="Төлбөр">
            <Icon name="tag" size={18} />
          </ActionButton>
        ) : null}
        {perms.passports ? (
          <ActionButton onClick={() => open("people")} label={`Паспорт ${ready}/${people}`} alert={b.status === "confirmed" && ready < people}>
            <Icon name="users" size={18} />
          </ActionButton>
        ) : null}
        {perms.passports ? (
          <ActionButton onClick={() => open("docs")} label="Баримт" className="col-span-4 flex-row gap-1.5 sm:col-span-1">
            <Icon name="ticket" size={18} />
          </ActionButton>
        ) : null}
      </div>

      <Sheet open={sheet === "status"} onClose={close} title="Төлөв солих">
        <p className="-mt-1 mb-3 text-xs text-muted">Төлөв солиход аялагчид аппаар нь автоматаар мэдэгдэнэ.</p>
        <div className="space-y-2">
          {STATUSES.map((s) => {
            const on = s.key === b.status;
            return (
              <button
                key={s.key}
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!on) save({ status: s.key });
                  close();
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.99] ${on ? "border-accent bg-accent/[0.06]" : "border-[var(--line)] bg-white"}`}
              >
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.tone}`}>{s.label}</span>
                <span className="min-w-0 flex-1 text-xs text-muted">{s.hint}</span>
                {on ? <span className="text-accent">✓</span> : null}
              </button>
            );
          })}
        </div>
        <label className="mt-4 block text-xs font-semibold text-muted">
          Ажилтны тэмдэглэл
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (b.staff_note ?? "") && save({ staffNote: note })}
            rows={3}
            maxLength={1000}
            placeholder="Хэн залгасан, юу тохирсон…"
            className="mt-1 w-full rounded-2xl border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
      </Sheet>
      <Sheet open={sheet === "chat"} onClose={close} tall title={<span className="block truncate">{b.name} · чат</span>}>
        <ChatPanel bookingId={b.id} canSend={perms.manage} />
      </Sheet>
      <Sheet open={sheet === "money"} onClose={close} title="Дүн, төлбөр">
        <MoneyPanel b={b} onChange={onChange} />
      </Sheet>
      <Sheet open={sheet === "people"} onClose={close} title={`Паспорт ${ready}/${people}`}>
        <PeoplePanel b={b} onChange={onChange} />
      </Sheet>
      <Sheet open={sheet === "docs"} onClose={close} tall title="Баримт, гэрээ">
        {sheet === "docs" ? <DocsPanel bookingId={b.id} /> : null}
      </Sheet>
    </article>
  );
}

function ActionButton({
  label,
  alert,
  onClick,
  href,
  className = "",
  children,
}: {
  label: string;
  alert?: boolean;
  onClick?: () => void;
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  const cls = `relative flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-bg py-2 text-[0.68rem] font-semibold text-ink transition active:scale-95 sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-3.5 sm:py-1.5 sm:text-xs sm:hover:bg-accent/10 ${className}`;
  const inner = (
    <>
      <span className="text-base leading-none sm:text-sm">{children}</span>
      <span className="truncate">{label}</span>
      {alert ? <span className="absolute right-2 top-1.5 size-2.5 rounded-full bg-red-500 sm:-right-0.5 sm:-top-0.5" /> : null}
    </>
  );
  return href ? (
    <a href={href} className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function ChatPanel({ bookingId, canSend }: { bookingId: string; canSend: boolean }) {
  const [messages, setMessages] = useState<TripMessage[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () => getThread(bookingId).then((m) => alive && setMessages(m));
    load();
    const t = window.setInterval(load, 10_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [bookingId]);

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [messages?.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    const res = await sendStaffMessage(bookingId, text);
    if (res.ok) {
      setText("");
      setMessages(await getThread(bookingId));
    } else setError(res.error);
    setSending(false);
  }

  return (
    <div className="flex h-full min-h-[50dvh] flex-col">
      <div ref={box} className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-bg p-3">
        {messages == null ? <p className="py-4 text-center text-xs text-muted">Ачаалж байна…</p> : null}
        {messages?.length === 0 ? <p className="py-4 text-center text-xs text-muted">Мессеж алга.</p> : null}
        {messages?.map((m) => (
          <div key={m.id} className={`flex ${m.sender === "traveller" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[82%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${
                m.sender === "traveller"
                  ? "rounded-bl-md bg-white text-ink shadow-sm"
                  : m.sender === "system"
                    ? "rounded-br-md bg-accent-mist text-ink"
                    : "rounded-br-md bg-accent text-white"
              }`}
            >
              <p className={`mb-0.5 text-[0.62rem] font-semibold ${m.sender === "staff" ? "text-white/60" : "text-muted"}`}>
                {m.sender === "traveller" ? "Аялагч" : m.sender === "system" ? "Автомат" : "Ажилтан"} · {when(m.at)}
              </p>
              {m.body}
            </div>
          </div>
        ))}
      </div>
      {!canSend ? <p className="mt-3 text-center text-xs text-muted">Зөвхөн харах эрхтэй.</p> : null}
      <form onSubmit={send} className={`mt-3 flex items-end gap-2 ${canSend ? "" : "hidden"}`}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          placeholder="Аялагчид хариулах…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button type="submit" disabled={sending || !text.trim()} aria-label="Илгээх" className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-white disabled:opacity-40">
          {sending ? (
            "…"
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </form>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

const digits = (v: string) => Number(v.replace(/[^\d]/g, "") || 0);

function MoneyPanel({ b, onChange }: { b: AdminBooking; onChange: (c: Partial<AdminBooking>) => void }) {
  const [total, setTotal] = useState(String(b.total));
  const [deposit, setDeposit] = useState(String(b.deposit));
  const [paid, setPaid] = useState("");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function saveAmounts() {
    setMessage(null);
    start(async () => {
      const res = await updateBooking(b.id, { total: digits(total), deposit: digits(deposit) });
      if (res.ok) {
        onChange({ total: digits(total), deposit: digits(deposit) });
        setMessage({ ok: true, text: "Дүн хадгалагдлаа." });
      } else setMessage({ ok: false, text: res.error });
    });
  }

  async function addPayment() {
    const value = digits(paid);
    if (!value || !(await confirmAction({ title: `${formatPrice(value)} төлбөр бүртгэх үү?`, body: "Захиалгад төлбөр нэмэгдэж, аялагчид мэдэгдэл очно.", confirm: "Бүртгэх" }))) return;
    setMessage(null);
    start(async () => {
      const res = await recordPayment(b.id, value);
      if (res.ok) {
        const sum = b.paid_amount + value;
        onChange({ paid_amount: sum, status: sum >= b.total ? "paid" : b.status === "cancelled" ? b.status : "confirmed" });
        setPaid("");
        setMessage({ ok: true, text: "Төлбөр бүртгэгдлээ." });
      } else setMessage({ ok: false, text: res.error });
    });
  }

  const input = "mt-1 block h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 font-num text-base text-ink outline-none focus:border-accent";
  const remaining = Math.max(0, b.total - b.paid_amount);
  return (
    <div className="space-y-4 pb-2">
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-bg p-3 text-center">
        <div>
          <p className="text-[0.65rem] font-semibold text-muted">Нийт</p>
          <p className="font-num text-sm">{formatPrice(b.total)}</p>
        </div>
        <div>
          <p className="text-[0.65rem] font-semibold text-muted">Төлсөн</p>
          <p className="font-num text-sm text-emerald-700">{formatPrice(b.paid_amount)}</p>
        </div>
        <div>
          <p className="text-[0.65rem] font-semibold text-muted">Үлдэгдэл</p>
          <p className="font-num text-sm">{formatPrice(remaining)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
        <p className="text-sm font-semibold">Дүн засах</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-muted">
            Нийт (₮)
            <input inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} className={input} />
          </label>
          <label className="text-xs font-semibold text-muted">
            Урьдчилгаа (₮)
            <input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} className={input} />
          </label>
        </div>
        <button type="button" disabled={pending} onClick={saveAmounts} className="mt-3 h-11 w-full rounded-full bg-ink text-sm font-semibold text-white disabled:opacity-60">
          Дүн хадгалах
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-4">
        <p className="text-sm font-semibold">Бэлэн / дансаар төлсөн</p>
        <input inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="₮ 0" className={input} />
        <button type="button" disabled={pending || !digits(paid)} onClick={addPayment} className="mt-3 h-11 w-full rounded-full bg-accent text-sm font-semibold text-white disabled:opacity-50">
          Төлбөр бүртгэх
        </button>
        <p className="mt-2 text-[0.7rem] leading-relaxed text-muted">QPay-ээр төлсөн нь автоматаар бүртгэгдэнэ. Бүртгэсэн төлбөр бүрд И-баримт гарч, аялагчид мэдэгдэл очно.</p>
      </section>
      {message ? <p className={`text-center text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p> : null}
    </div>
  );
}

function PeoplePanel({ b, onChange }: { b: AdminBooking; onChange: (c: Partial<AdminBooking>) => void }) {
  const [passengers, setPassengers] = useState<Passenger[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!b.passengers_count) return;
    let alive = true;
    viewPassengers(b.id)
      .then((p) => alive && setPassengers(p))
      .catch(() => alive && setError("Паспортын мэдээлэл уншиж чадсангүй."));
    return () => {
      alive = false;
    };
  }, [b.id, b.passengers_count]);

  async function remove() {
    if (!(await confirmAction({ title: "Паспортын мэдээллийг устгах уу?", body: "Энэ захиалгын паспортын мэдээлэл бүрмөсөн устна. Аялагчид мэдэгдэл очно.", confirm: "Устгах", danger: true }))) return;
    start(async () => {
      const res = await adminDeletePassengers(b.id);
      if (res.ok) {
        setPassengers([]);
        onChange({ passengers_count: 0, passengers_ready: 0 });
      }
    });
  }

  if (!b.passengers_count) return <p className="rounded-2xl bg-bg p-6 text-center text-sm text-muted">Аялагч паспортын мэдээллээ оруулаагүй байна.</p>;
  if (error) return <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!passengers) return <p className="rounded-2xl bg-bg p-6 text-center text-sm text-muted">Шифрээс тайлж байна…</p>;
  return (
    <div className="space-y-2 pb-2">
      <p className="text-[0.7rem] text-muted"><Icon name="lock" size={14} className="mr-1.5 inline -mt-0.5 text-muted" />Шифрлэгдсэн мэдээлэл. Энэ харалт бүртгэгдлээ.</p>
      {passengers.map((p, i) => {
        const issue = passengerIssue(p, b.travel_date);
        return (
          <div key={i} className="rounded-2xl border border-[var(--line)] bg-white p-3.5">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{p.name || "—"}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${issue ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{issue ?? "Бэлэн"}</span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <div>
                <dt className="text-muted">Паспорт</dt>
                <dd className="font-mono font-semibold">{p.passport ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Дуусах</dt>
                <dd className="font-semibold">{p.expiry ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Төрсөн</dt>
                <dd className="font-semibold">{p.birth ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Хүйс</dt>
                <dd className="font-semibold">{p.gender === "M" ? "Эр" : p.gender === "F" ? "Эм" : "—"}</dd>
              </div>
            </dl>
          </div>
        );
      })}
      <button type="button" disabled={pending} onClick={remove} className="mt-2 h-11 w-full rounded-full border border-red-200 text-sm font-semibold text-red-600 disabled:opacity-50">
        Паспортын мэдээлэл устгах
      </button>
    </div>
  );
}
