import { departureOf } from "@/lib/dates";
import type { Care, DocSlot, DocStatus } from "@/lib/documents";

/** Shared by the traveller app, the API and /admin — no server-only imports here. */

export type TripStatus = "new" | "contacted" | "confirmed" | "paid" | "cancelled" | "waitlist";

export const STATUS_LABEL: Record<TripStatus, string> = {
  new: "Шинэ",
  contacted: "Холбогдсон",
  confirmed: "Баталгаажсан",
  paid: "Төлсөн",
  cancelled: "Цуцалсан",
  waitlist: "Хүлээлэг",
};

/** Statuses that occupy seats on a departure. */
export const HOLDING_STATUSES: TripStatus[] = ["new", "contacted", "confirmed", "paid"];

export type Passenger = {
  /** Latin, exactly as printed in the passport */
  name: string;
  gender?: "M" | "F";
  /** YYYY-MM-DD */
  birth?: string;
  passport?: string;
  /** YYYY-MM-DD */
  expiry?: string;
};

export type TripMessage = { id: number; at: string; sender: "traveller" | "staff" | "system"; body: string };

export type PayOption = { kind: "deposit" | "balance" | "full"; label: string; amount: number };

/** Logos are the partners' App Store icons (public/partners). */
export const INSTALLMENT_PROVIDERS = [
  { id: "pocket", name: "Pocket", color: "#e8375a", logo: "/partners/pocket.png" },
  { id: "toki", name: "Toki", color: "#c9a800", logo: "/partners/toki.png" },
  { id: "simple", name: "Simple", color: "#00a8b0", logo: "/partners/simple.png" },
  { id: "dari", name: "Dari", color: "#1b1d22", logo: "/partners/dari.png" },
] as const;

export type InstallmentProviderId = (typeof INSTALLMENT_PROVIDERS)[number]["id"];

export type InstallmentProvider = { id: InstallmentProviderId; name: string; color: string; logo: string; min: number | null; max: number | null; terms: string | null };

/** A pay-later request the team is processing in the partner's merchant portal. */
export type InstallmentRequest = { id: string; provider: InstallmentProviderId; amount: number; phone: string | null; sent: boolean; at: string };

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  qpay: "QPay",
  manual: "Бэлэн / данс",
  ...Object.fromEntries(INSTALLMENT_PROVIDERS.map((p) => [p.id, p.name])),
};

export type TripInvoice = {
  id: string;
  amount: number;
  qrImage: string | null;
  qrText: string | null;
  urls: { name: string; description?: string; logo?: string; link: string }[];
  mock: boolean;
};

export type TripReceipt = { amount: number; status: "pending" | "issued" | "failed"; billId: string | null; lottery: string | null; at: string; mock: boolean };

/** What the traveller's device sees for one booking (read with its access token). */
export type Trip = {
  id: string;
  tourId: string;
  tourTitle: string;
  travelDate: string | null;
  status: TripStatus;
  adults: number;
  kidsOwnBed: number;
  kidsSharedBed: number;
  singleRooms: number;
  total: number;
  deposit: number;
  paidAmount: number;
  passengers: Passenger[];
  passportConsent: boolean;
  passportStorage: boolean;
  messages: TripMessage[];
  invoice: TripInvoice | null;
  payOptions: PayOption[];
  qpay: "live" | "mock" | "off";
  receipts: TripReceipt[];
  installments: InstallmentProvider[];
  installment: InstallmentRequest | null;
  documents: TripDocSlot[];
  care: Care | null;
  contract: TripContract;
};

export type TripDocSlot = DocSlot & { status: DocStatus | null; note: string | null; uploadedAt: string | null };

export type TripContract =
  | { state: "unavailable" }
  | { state: "unsigned"; body: string }
  | { state: "signed"; body: string; name: string; signedAt: string; signature: string };

export type TripSummary = { id: string; status: TripStatus; unread: number; paidAmount: number; total: number };

/** tourId → date label → seats left. Only departures with a capacity (or closed) appear. */
export type SeatMap = Record<string, Record<string, { left: number; closed: boolean }>>;

export function partySize(b: { adults: number; kidsOwnBed: number; kidsSharedBed: number }) {
  return b.adults + b.kidsOwnBed + b.kidsSharedBed;
}

/** Live bookings can pay straight away (the first payment confirms them): deposit first, then the balance. */
export function payOptions(status: TripStatus, total: number, deposit: number, paid: number): PayOption[] {
  if (status !== "new" && status !== "contacted" && status !== "confirmed") return [];
  const remaining = total - paid;
  if (remaining <= 0) return [];
  if (deposit > paid && deposit < total) {
    return [
      { kind: "deposit", label: "Урьдчилгаа", amount: deposit - paid },
      { kind: "full", label: "Бүтэн төлөх", amount: remaining },
    ];
  }
  return [{ kind: paid > 0 ? "balance" : "full", label: paid > 0 ? "Үлдэгдэл" : "Бүтэн төлөх", amount: remaining }];
}

/** 0–4 filled steps of: request · contacted · confirmed · paid (deposit counts as started). */
export function progressOf(status: TripStatus | undefined, paid = 0, total = 0) {
  if (!status) return 1;
  if (status === "paid" || (total > 0 && paid >= total)) return 4;
  if (status === "confirmed") return paid > 0 ? 4 : 3;
  if (status === "contacted") return 2;
  return 1;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Why a passenger is not ready to fly, or null. Passports must be valid 6 months past departure. */
export function passengerIssue(p: Passenger, travelDate: string | null, now = new Date()) {
  if (!p.name || !p.passport || !p.expiry || !p.birth) return "Мэдээлэл дутуу";
  if (!ISO_DATE.test(p.expiry)) return "Хугацаа буруу";
  const limit = new Date(departureOf(travelDate ?? undefined, now) ?? now);
  limit.setMonth(limit.getMonth() + 6);
  if (new Date(p.expiry) < limit) return "Паспортын хугацаа 6 сараас бага үлдэнэ";
  return null;
}
