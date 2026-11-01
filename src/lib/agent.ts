import type { Tour } from "@/data/tours";
import type { Permission } from "@/lib/permissions";
import type { TripStatus } from "@/lib/trips";

/** Shared by the admin AI agent's server tools and its dashboard. No server-only imports. */

/** Last four digits only: the model never needs a traveller's full number. */
export function maskPhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? `****${digits.slice(-4)}` : "****";
}

export const firstName = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] ?? "";

export type SalesBooking = {
  created_at: string;
  tour_id: string;
  tour_title: string;
  status: TripStatus;
  total: number;
  paid_amount: number;
  adults: number;
  kids_own_bed: number;
  kids_shared_bed: number;
};
export type SalesPayment = { amount: number; paid_at: string | null; method: string };
export type SalesGroup = "month" | "tour" | "method" | "status";

const won = (s: TripStatus) => s === "confirmed" || s === "paid";
const monthOf = (iso: string) => iso.slice(0, 7);

/**
 * Sales figures for [from, to) (ISO dates, either open). Bookings count by request date,
 * collected money by payment date. Cancelled and waitlisted bookings bring no revenue.
 */
export function salesSummary(bookings: SalesBooking[], payments: SalesPayment[], opts: { from?: string; to?: string; groupBy: SalesGroup }) {
  const inRange = (iso: string | null) => !!iso && (!opts.from || iso >= opts.from) && (!opts.to || iso < opts.to);
  const rows = bookings.filter((b) => inRange(b.created_at));
  const paid = payments.filter((p) => inRange(p.paid_at));
  const decided = rows.filter((b) => b.status !== "waitlist");
  const booked = rows.filter((b) => won(b.status));
  const people = (b: SalesBooking) => b.adults + b.kids_own_bed + b.kids_shared_bed;

  const totals = {
    requests: rows.length,
    confirmed_bookings: booked.length,
    conversion_percent: decided.length ? Math.round((booked.length / decided.length) * 100) : null,
    travellers_booked: booked.reduce((n, b) => n + people(b), 0),
    booked_value: booked.reduce((s, b) => s + b.total, 0),
    collected: paid.reduce((s, p) => s + p.amount, 0),
    receivable: booked.reduce((s, b) => s + Math.max(0, b.total - b.paid_amount), 0),
    cancelled: rows.filter((b) => b.status === "cancelled").length,
  };

  const groups = new Map<string, { key: string; label: string; requests: number; confirmed: number; booked_value: number; collected: number }>();
  const bucket = (key: string, label: string) => {
    if (!groups.has(key)) groups.set(key, { key, label, requests: 0, confirmed: 0, booked_value: 0, collected: 0 });
    return groups.get(key)!;
  };
  if (opts.groupBy === "method") {
    for (const p of paid) bucket(p.method, p.method).collected += p.amount;
  } else {
    for (const b of rows) {
      const key = opts.groupBy === "month" ? monthOf(b.created_at) : opts.groupBy === "tour" ? b.tour_id : b.status;
      const g = bucket(key, opts.groupBy === "tour" ? b.tour_title : key);
      g.requests++;
      if (won(b.status)) {
        g.confirmed++;
        g.booked_value += b.total;
      }
      if (opts.groupBy !== "month") g.collected += b.paid_amount;
    }
    if (opts.groupBy === "month") for (const p of paid) bucket(monthOf(p.paid_at!), monthOf(p.paid_at!)).collected += p.amount;
  }
  const list = [...groups.values()].sort((a, b) => (opts.groupBy === "month" ? a.key.localeCompare(b.key) : b.booked_value + b.collected - (a.booked_value + a.collected)));
  return { period: { from: opts.from ?? null, to: opts.to ?? null }, totals, groups: list };
}

/** Tour fields the agent may change. `id` is fixed on update (renaming breaks links and bookings). */
export const EDITABLE_TOUR_FIELDS = [
  "title",
  "destination",
  "destinationKey",
  "description",
  "story",
  "price",
  "oldPrice",
  "duration",
  "nights",
  "tag",
  "status",
  "discount",
  "image",
  "gallery",
  "dates",
  "stay",
  "departure",
  "highlights",
  "includes",
  "excludes",
  "itinerary",
  "pricing",
  "notes",
  "documents",
] as const satisfies readonly (keyof Tour)[];

export type DiffRow = { field: string; before: unknown; after: unknown };

/** Fields whose values differ (deep compare), in the editor's field order. */
export function tourDiff(before: Partial<Tour> | null, after: Partial<Tour>): DiffRow[] {
  const keys = ["id", ...EDITABLE_TOUR_FIELDS] as (keyof Tour)[];
  return keys
    .filter((k) => JSON.stringify(before?.[k] ?? null) !== JSON.stringify(after[k] ?? null))
    .map((k) => ({ field: k, before: before?.[k] ?? null, after: after[k] ?? null }));
}

export const TOOL_LABEL: Record<string, string> = {
  listTours: "Аяллын жагсаалт",
  searchTours: "Аялал хайх",
  getTour: "Аяллын мэдээлэл",
  searchBookings: "Захиалга хайх",
  getBooking: "Захиалгын дэлгэрэнгүй",
  analyzeSales: "Борлуулалтын шинжилгээ",
  analyzeTraffic: "Сайтын хандалт",
  listDepartures: "Огноо, суудал",
  tourWritingContext: "Бичих мэдээлэл",
  proposeTourUpdate: "Аялал засах санал",
  proposeTourCreate: "Шинэ аяллын санал",
  proposeDepartureUpdate: "Суудал өөрчлөх санал",
  proposeMessage: "Мессежийн санал",
  proposeNews: "Мэдээний санал",
};

export type ProposalKind = "tour.create" | "tour.update" | "departure.update" | "message.send" | "news.create";

/** Who may approve each kind of proposal (the same permission the matching admin screen needs). */
export const PROPOSAL_PERMISSION: Record<ProposalKind, Permission> = {
  "tour.create": "content.manage",
  "tour.update": "content.manage",
  "departure.update": "departures.manage",
  "message.send": "bookings.manage",
  "news.create": "content.manage",
};

export const KIND_LABEL: Record<ProposalKind, string> = {
  "tour.create": "Шинэ аялал",
  "tour.update": "Аялал засах",
  "departure.update": "Суудал, огноо",
  "message.send": "Аялагчид мессеж",
  "news.create": "Шинэ мэдээ",
};

export const isProposalTool = (name: string) => name.startsWith("propose");

export type ProposalStatus = "pending" | "applied" | "cancelled" | "stale" | "failed";

/** What a proposal tool returns and the dashboard renders as an approval card. */
export type ProposalView = {
  proposalId: string;
  kind: ProposalKind;
  targetId: string;
  summary: string;
  diff: DiffRow[];
  status: ProposalStatus;
};

export const FIELD_LABEL: Record<string, string> = {
  id: "ID",
  title: "Нэр",
  destination: "Чиглэл",
  destinationKey: "Чиглэлийн түлхүүр",
  description: "Товч тайлбар",
  story: "Дэлгэрэнгүй",
  price: "Үнэ",
  oldPrice: "Хуучин үнэ",
  duration: "Хугацаа",
  nights: "Шөнө",
  tag: "Шошго",
  status: "Төлөв",
  discount: "Хөнгөлөлт",
  image: "Зураг",
  gallery: "Цомог",
  dates: "Огноо",
  stay: "Буудал",
  departure: "Нислэг",
  highlights: "Онцлох",
  includes: "Багтсан",
  excludes: "Ороогүй",
  itinerary: "Хөтөлбөр",
  pricing: "Үнийн нөхцөл",
  notes: "Тэмдэглэл",
  documents: "Шаардлагатай баримт",
  capacity: "Нийт суудал",
  closed: "Захиалга хаах",
  message: "Мессеж",
  booking: "Захиалга",
  category: "Ангилал",
  excerpt: "Товч",
  body: "Агуулга",
  tourId: "Холбоотой аялал",
  readMin: "Унших минут",
};
