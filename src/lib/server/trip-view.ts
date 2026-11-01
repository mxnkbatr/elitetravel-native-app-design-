import "server-only";

import { documentSlots, type DocType } from "@/lib/documents";
import { contractFor, getContractTemplate, signedContract } from "@/lib/server/contract";
import { listDocuments, readCare } from "@/lib/server/documents";
import { installmentProviders, pendingInstallments, toRequest } from "@/lib/server/installments";
import { passportStorageReady, readPassengers } from "@/lib/server/passports";
import { qpayMode } from "@/lib/server/qpay";
import { BOOKING_COLUMNS, db, type BookingRow } from "@/lib/server/trips";
import { payOptions, type Trip, type TripContract, type TripDocSlot, type TripInvoice, type TripReceipt } from "@/lib/trips";

/** The booking a traveller's device may act on: addressed only by its access token (header `x-trip-token`). */
export async function bookingFromRequest(request: Request) {
  const token = request.headers.get("x-trip-token") ?? "";
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const { data } = await db().from("booking_requests").select(BOOKING_COLUMNS).eq("access_token", token).maybeSingle();
  return (data as BookingRow | null) ?? null;
}

/** Document slots the booking's tour asks for, given the party size. Read live, not from the page cache. */
export async function requiredSlots(b: BookingRow) {
  const { data } = await db().from("tours").select("data->documents").eq("id", b.tour_id).maybeSingle();
  const types = Array.isArray(data?.documents) ? (data.documents as DocType[]) : undefined;
  return documentSlots(types, { adults: b.adults, kids: b.kids_own_bed + b.kids_shared_bed });
}

export async function tripView(b: BookingRow): Promise<Trip> {
  const client = db();
  const [{ data: messages }, { data: invoice }, { data: receipts }, installments, [installment], passengers, slots, docs, care, template, signed] = await Promise.all([
    client.from("booking_messages").select("id, created_at, sender, body").eq("booking_id", b.id).order("created_at").limit(300),
    client
      .from("payments")
      .select("id, amount, qr_image, qr_text, urls, qpay_invoice_id")
      .eq("booking_id", b.id)
      .eq("status", "pending")
      .eq("method", "qpay")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client.from("receipts").select("amount, status, bill_id, lottery, created_at, provider").eq("booking_id", b.id).order("created_at"),
    installmentProviders(),
    pendingInstallments([b.id]),
    readPassengers(b.id).catch(() => []),
    requiredSlots(b),
    listDocuments(b.id),
    readCare(b.id).catch(() => null),
    getContractTemplate(),
    signedContract(b.id),
  ]);
  const total = Number(b.total);
  const deposit = Number(b.deposit);
  const paid = Number(b.paid_amount);

  const documents: TripDocSlot[] = slots.map((s) => {
    const d = docs.find((x) => x.doc_type === s.type && x.slot === s.slot);
    return { ...s, status: d?.status ?? null, note: d?.staff_note ?? null, uploadedAt: d?.uploaded_at ?? null };
  });
  const contract: TripContract = signed
    ? { state: "signed", body: signed.body, name: signed.signed_name, signedAt: signed.signed_at, signature: signed.signature_png }
    : template.published && b.status !== "cancelled"
      ? { state: "unsigned", body: contractFor(template, b) }
      : { state: "unavailable" };

  return {
    id: b.id,
    tourId: b.tour_id,
    tourTitle: b.tour_title,
    travelDate: b.travel_date,
    status: b.status,
    adults: b.adults,
    kidsOwnBed: b.kids_own_bed,
    kidsSharedBed: b.kids_shared_bed,
    singleRooms: b.single_rooms,
    total,
    deposit,
    paidAmount: paid,
    passengers,
    passportConsent: b.passport_consent_at != null,
    passportStorage: passportStorageReady(),
    messages: (messages ?? []).map((m) => ({ id: m.id, at: m.created_at, sender: m.sender, body: m.body })),
    invoice: invoice
      ? {
          id: invoice.id,
          amount: Number(invoice.amount),
          qrImage: invoice.qr_image,
          qrText: invoice.qr_text,
          urls: (invoice.urls ?? []) as TripInvoice["urls"],
          mock: String(invoice.qpay_invoice_id).startsWith("MOCK-"),
        }
      : null,
    payOptions: payOptions(b.status, total, deposit, paid),
    qpay: qpayMode(),
    receipts: (receipts ?? []).map(
      (r): TripReceipt => ({ amount: Number(r.amount), status: r.status, billId: r.bill_id, lottery: r.lottery, at: r.created_at, mock: r.provider === "mock" }),
    ),
    installments,
    installment: installment ? toRequest(installment) : null,
    documents,
    care,
    contract,
  };
}
