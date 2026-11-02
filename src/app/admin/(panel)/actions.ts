"use server";

import { formatPrice } from "@/data/tours";
import { can, ROLES, type Role } from "@/lib/permissions";
import { audit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { CONTENT_TAG } from "@/lib/server/content";
import { invalidMessage, parseNews, parseTour } from "@/lib/server/content-validate";
import { issueReceipt } from "@/lib/server/ebarimt";
import { deletePassengers, logPassportAccess, readPassengers } from "@/lib/server/passports";
import { onPaymentPaid } from "@/lib/server/payments";
import { promoteWaitlist } from "@/lib/server/seats";
import { BOOKING_COLUMNS, db, postMessage, refreshSeats, statusNotice, type BookingRow } from "@/lib/server/trips";
import { unfilledParts } from "@/lib/contract";
import { docInfo, type Care, type DocSlot, type DocStatus } from "@/lib/documents";
import { getContractTemplate, setContractTemplate, signedContract } from "@/lib/server/contract";
import { listDocuments, readCare, reviewDocument } from "@/lib/server/documents";
import { requiredSlots } from "@/lib/server/trip-view";
import { INSTALLMENT_PROVIDERS, PAYMENT_METHOD_LABEL, type Passenger, type TripMessage, type TripStatus } from "@/lib/trips";
import { revalidatePath, revalidateTag } from "next/cache";
import { createHash, randomBytes } from "node:crypto";

export type SaveResult = { ok: true } | { ok: false; error: string };

const BOOKING_STATUSES: TripStatus[] = ["new", "contacted", "confirmed", "paid", "cancelled", "waitlist"];
const DENIED: SaveResult = { ok: false, error: "Танд энэ үйлдлийг хийх эрх алга." };

/** The live site reads tours/news through a tagged cache; expire it so edits show at once. */
function refreshSite() {
  revalidateTag(CONTENT_TAG, { expire: 0 });
}

const amount = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10_000_000_000 ? (v as number) : null);

export async function updateBooking(
  id: string,
  patch: { status?: string; staffNote?: string; total?: number; deposit?: number },
): Promise<SaveResult> {
  const admin = await requireAdmin("bookings.view");
  const touchesStatus = patch.status !== undefined || patch.staffNote !== undefined;
  const touchesMoney = patch.total !== undefined || patch.deposit !== undefined;
  if ((touchesStatus && !can(admin.role, "bookings.manage")) || (touchesMoney && !can(admin.role, "money.manage"))) return DENIED;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) {
    if (!BOOKING_STATUSES.includes(patch.status as TripStatus)) return { ok: false, error: "Төлөв буруу." };
    update.status = patch.status;
  }
  if (patch.staffNote !== undefined) update.staff_note = patch.staffNote.trim().slice(0, 1000) || null;
  if (patch.total !== undefined) {
    if (amount(patch.total) == null) return { ok: false, error: "Дүн буруу." };
    update.total = patch.total;
  }
  if (patch.deposit !== undefined) {
    if (amount(patch.deposit) == null) return { ok: false, error: "Урьдчилгаа буруу." };
    update.deposit = patch.deposit;
  }
  const { data: before } = await db().from("booking_requests").select("status, total, deposit").eq("id", id).maybeSingle();
  const { data, error } = await db()
    .from("booking_requests")
    .update(update)
    .eq("id", id)
    .select("total, deposit, paid_amount, tour_id, travel_date")
    .single();
  if (error) return { ok: false, error: "Хадгалж чадсангүй." };

  if (patch.status && patch.status !== before?.status) await audit(admin.email, "booking.status", { type: "booking", id }, { from: before?.status, to: patch.status });
  if (touchesMoney) await audit(admin.email, "booking.amounts", { type: "booking", id }, { from: { total: before?.total, deposit: before?.deposit }, to: { total: patch.total, deposit: patch.deposit } });
  if (patch.staffNote !== undefined) await audit(admin.email, "booking.note", { type: "booking", id });

  if (patch.status) {
    // The traveller hears about every status change in their app
    const notice = statusNotice(patch.status as TripStatus, data);
    if (notice) await postMessage(id, "system", notice);
    refreshSeats();
    if (patch.status === "cancelled") await promoteWaitlist(data.tour_id, data.travel_date ?? "");
  }
  revalidatePath("/admin");
  return { ok: true };
}

/** A booking's chat thread; opening it marks the traveller's messages as read. */
export async function getThread(bookingId: string): Promise<TripMessage[]> {
  const admin = await requireAdmin("bookings.view");
  const client = db();
  const { data } = await client.from("booking_messages").select("id, created_at, sender, body").eq("booking_id", bookingId).order("created_at").limit(300);
  if (can(admin.role, "bookings.manage")) await client.from("booking_requests").update({ staff_seen_at: new Date().toISOString() }).eq("id", bookingId);
  return (data ?? []).map((m) => ({ id: m.id, at: m.created_at, sender: m.sender, body: m.body }));
}

export async function sendStaffMessage(bookingId: string, body: string): Promise<SaveResult> {
  const admin = await requireAdmin("bookings.view");
  if (!can(admin.role, "bookings.manage")) return DENIED;
  const text = body.trim().slice(0, 2000);
  if (!text) return { ok: false, error: "Мессеж хоосон байна." };
  if (!(await postMessage(bookingId, "staff", text, { author: admin.email }))) return { ok: false, error: "Илгээж чадсангүй." };
  return { ok: true };
}

export async function retryReceipt(paymentId: string): Promise<SaveResult> {
  const admin = await requireAdmin("money.manage");
  await issueReceipt(paymentId);
  await audit(admin.email, "receipt.retry", { type: "payment", id: paymentId });
  revalidatePath("/admin/payments");
  return { ok: true };
}

/** Decrypts one booking's passports for staff; every view is logged. */
export async function viewPassengers(bookingId: string): Promise<Passenger[]> {
  const admin = await requireAdmin("passports.view");
  const passengers = await readPassengers(bookingId);
  await logPassportAccess(admin.email, bookingId, "view");
  return passengers;
}

export async function adminDeletePassengers(bookingId: string): Promise<SaveResult> {
  const admin = await requireAdmin("passports.view");
  await deletePassengers(bookingId, admin.email);
  await postMessage(bookingId, "system", "Таны паспортын мэдээллийг манай системээс устгалаа.");
  revalidatePath("/admin");
  return { ok: true };
}

/** Cash / bank transfer received outside QPay. */
export async function recordPayment(bookingId: string, paid: number): Promise<SaveResult> {
  const admin = await requireAdmin("money.manage");
  if (!amount(paid) || paid <= 0) return { ok: false, error: "Дүн буруу." };
  const paymentId = `${bookingId}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const { error } = await db()
    .from("payments")
    .insert({
      id: paymentId,
      booking_id: bookingId,
      amount: paid,
      status: "paid",
      paid_at: new Date().toISOString(),
      method: "manual",
      qr_text: `manual:${admin.email}`,
    });
  if (error) return { ok: false, error: "Бүртгэж чадсангүй." };
  await audit(admin.email, "payment.manual", { type: "booking", id: bookingId }, { amount: paid, paymentId });
  await onPaymentPaid(paymentId, bookingId, paid);
  revalidatePath("/admin");
  return { ok: true };
}

async function openInstallment(paymentId: string) {
  const { data } = await db()
    .from("payments")
    .select("id, booking_id, amount, method, phone, invoice_sent_at")
    .eq("id", paymentId)
    .eq("status", "pending")
    .neq("method", "qpay")
    .maybeSingle();
  return data;
}

/** Staff sent the invoice from the partner's merchant portal; the traveller is asked to approve it. */
export async function installmentSent(paymentId: string): Promise<SaveResult> {
  const admin = await requireAdmin("money.manage");
  const p = await openInstallment(paymentId);
  if (!p) return { ok: false, error: "Хүсэлт олдсонгүй." };
  await db().from("payments").update({ invoice_sent_at: new Date().toISOString() }).eq("id", p.id);
  const name = PAYMENT_METHOD_LABEL[p.method];
  await postMessage(p.booking_id, "system", `${name} апп руу ${formatPrice(Number(p.amount))}-ийн нэхэмжлэх илгээлээ. ${name} аппаа нээж баталгаажуулна уу.`);
  await audit(admin.email, "installment.sent", { type: "booking", id: p.booking_id }, { provider: p.method, amount: Number(p.amount) });
  revalidatePath("/admin/payments");
  return { ok: true };
}

/** The partner approved the loan and settled with us. */
export async function installmentPaid(paymentId: string): Promise<SaveResult> {
  const admin = await requireAdmin("money.manage");
  const p = await openInstallment(paymentId);
  if (!p) return { ok: false, error: "Хүсэлт олдсонгүй." };
  const { data: flipped } = await db()
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", p.id)
    .eq("status", "pending")
    .select("id");
  if (flipped?.length) {
    await audit(admin.email, "installment.paid", { type: "booking", id: p.booking_id }, { provider: p.method, amount: Number(p.amount) });
    await onPaymentPaid(p.id, p.booking_id, Number(p.amount));
  }
  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  return { ok: true };
}

export async function installmentCancel(paymentId: string, reason: string): Promise<SaveResult> {
  const admin = await requireAdmin("money.manage");
  const p = await openInstallment(paymentId);
  if (!p) return { ok: false, error: "Хүсэлт олдсонгүй." };
  await db().from("payments").update({ status: "cancelled" }).eq("id", p.id);
  const name = PAYMENT_METHOD_LABEL[p.method];
  await postMessage(
    p.booking_id,
    "system",
    [`${name}-ээр хуваан төлөх хүсэлт цуцлагдлаа.`, reason.trim().slice(0, 300), "Өөр аргаар төлөх эсвэл дахин хүсэлт илгээх боломжтой."].filter(Boolean).join(" "),
  );
  await audit(admin.email, "installment.cancelled", { type: "booking", id: p.booking_id }, { provider: p.method, reason: reason.trim().slice(0, 300) });
  revalidatePath("/admin/payments");
  return { ok: true };
}

export async function saveProvider(id: string, patch: { enabled: boolean; min: number | null; max: number | null; terms: string }): Promise<SaveResult> {
  const admin = await requireAdmin("money.manage");
  if (!INSTALLMENT_PROVIDERS.some((p) => p.id === id)) return { ok: false, error: "Буруу хүсэлт." };
  if ((patch.min != null && amount(patch.min) == null) || (patch.max != null && amount(patch.max) == null)) return { ok: false, error: "Дүн буруу." };
  const { error } = await db()
    .from("payment_providers")
    .upsert(
      { id, enabled: patch.enabled, min_amount: patch.min, max_amount: patch.max, terms: patch.terms.trim().slice(0, 200) || null, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
  if (error) return { ok: false, error: "Хадгалж чадсангүй." };
  await audit(admin.email, "provider.settings", { type: "provider", id }, patch);
  revalidatePath("/admin/payments");
  return { ok: true };
}

export async function saveDeparture(tourId: string, label: string, capacity: number | null, closed: boolean): Promise<SaveResult> {
  const admin = await requireAdmin("departures.manage");
  if (capacity != null && (!Number.isInteger(capacity) || capacity < 0 || capacity > 999)) return { ok: false, error: "Суудлын тоо буруу." };
  const { error } = await db()
    .from("departures")
    .upsert({ tour_id: tourId, date_label: label, capacity, closed, updated_at: new Date().toISOString() }, { onConflict: "tour_id,date_label" });
  if (error) return { ok: false, error: "Хадгалж чадсангүй." };
  await audit(admin.email, "departure.save", { type: "departure", id: `${tourId}|${label}` }, { capacity, closed });
  refreshSeats();
  await promoteWaitlist(tourId, label);
  revalidatePath("/admin/departures");
  return { ok: true };
}

/** One message to every live booking on a departure (flight change, meeting point…). */
export async function broadcast(tourId: string, label: string, body: string): Promise<SaveResult & { sent?: number }> {
  const admin = await requireAdmin("departures.manage");
  const text = body.trim().slice(0, 2000);
  if (!text) return { ok: false, error: "Мессеж хоосон байна." };
  let query = db().from("booking_requests").select("id").eq("tour_id", tourId).neq("status", "cancelled");
  query = label ? query.eq("travel_date", label) : query.is("travel_date", null);
  const { data } = await query;
  const ids = (data ?? []).map((r) => r.id);
  if (!ids.length) return { ok: false, error: "Энэ огноонд захиалга алга." };
  const { error } = await db()
    .from("booking_messages")
    .insert(ids.map((id) => ({ booking_id: id, sender: "staff", body: text, author: admin.email })));
  if (error) return { ok: false, error: "Илгээж чадсангүй." };
  await audit(admin.email, "departure.broadcast", { type: "departure", id: `${tourId}|${label}` }, { recipients: ids.length, text: text.slice(0, 200) });
  return { ok: true, sent: ids.length };
}

type Table = "tours" | "news";

async function save(table: Table, input: unknown, originalId: string | null): Promise<SaveResult> {
  const admin = await requireAdmin("content.manage");
  let item: { id: string };
  try {
    item = table === "tours" ? parseTour(input) : parseNews(input);
  } catch (e) {
    const message = invalidMessage(e);
    if (message) return { ok: false, error: message };
    throw e;
  }

  const client = db();
  if (originalId === null || originalId !== item.id) {
    const { data: taken } = await client.from(table).select("id").eq("id", item.id).maybeSingle();
    if (taken) return { ok: false, error: `«${item.id}» ID аль хэдийн байна.` };
  }

  const row = { id: item.id, data: item, updated_at: new Date().toISOString(), updated_by: admin.email };
  if (originalId === null) {
    // New items go to the top of the list
    const { data: first } = await client.from(table).select("position").order("position").limit(1).maybeSingle();
    const { error } = await client.from(table).insert({ ...row, position: (first?.position ?? 0) - 1 });
    if (error) return { ok: false, error: "Хадгалж чадсангүй." };
  } else {
    const { error } = await client.from(table).update(row).eq("id", originalId);
    if (error) return { ok: false, error: "Хадгалж чадсангүй." };
  }
  await audit(admin.email, originalId === null ? `${table}.create` : `${table}.update`, { type: table, id: item.id });

  refreshSite();
  revalidatePath(`/admin/${table}`);
  return { ok: true };
}

export async function saveTour(input: unknown, originalId: string | null) {
  return save("tours", input, originalId);
}

export async function saveNews(input: unknown, originalId: string | null) {
  return save("news", input, originalId);
}

export async function deleteItem(table: Table, id: string): Promise<SaveResult> {
  const admin = await requireAdmin("content.manage");
  if (table !== "tours" && table !== "news") return { ok: false, error: "Буруу хүсэлт." };
  const { error } = await db().from(table).delete().eq("id", id);
  if (error) return { ok: false, error: "Устгаж чадсангүй." };
  await audit(admin.email, `${table}.delete`, { type: table, id });
  refreshSite();
  revalidatePath(`/admin/${table}`);
  return { ok: true };
}

/** Saves a new display order: ids top to bottom. */
export async function reorder(table: Table, ids: string[]): Promise<SaveResult> {
  const admin = await requireAdmin("content.manage");
  if (table !== "tours" && table !== "news") return { ok: false, error: "Буруу хүсэлт." };
  const client = db();
  const results = await Promise.all(ids.map((id, position) => client.from(table).update({ position }).eq("id", id)));
  if (results.some((r) => r.error)) return { ok: false, error: "Дараалал хадгалж чадсангүй." };
  await audit(admin.email, `${table}.reorder`, { type: table, id: "*" });
  refreshSite();
  revalidatePath(`/admin/${table}`);
  return { ok: true };
}

/** Short-lived signature so the browser can upload one image straight to Cloudinary. */
export async function signImageUpload() {
  await requireAdmin("content.manage");
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !secret) throw new Error("Cloudinary is not configured");
  const folder = "elitetravel/admin";
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
  return { cloudName, apiKey, folder, timestamp, signature };
}

/* ── Staff ──────────────────────────────────────────────────────────── */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ownerCount() {
  const { count } = await db().from("admin_users").select("email", { count: "exact", head: true }).eq("role", "owner");
  return count ?? 0;
}

/**
 * Adds a staff member to the allowlist and, if they have no login yet, sends a Supabase invite
 * email so they can set a password.
 */
export async function addStaff(email: string, role: Role, name: string): Promise<SaveResult & { invited?: boolean; note?: string }> {
  const admin = await requireAdmin("staff.manage");
  const e = email.trim().toLowerCase();
  if (!EMAIL.test(e)) return { ok: false, error: "Имэйл буруу." };
  if (!ROLES.includes(role)) return { ok: false, error: "Үүрэг буруу." };
  const { error } = await db().from("admin_users").insert({ email: e, role, name: name.trim().slice(0, 80) || null });
  if (error) return { ok: false, error: error.code === "23505" ? "Энэ имэйл аль хэдийн бүртгэлтэй." : "Нэмж чадсангүй." };
  await audit(admin.email, "staff.add", { type: "staff", id: e }, { role });

  const site = process.env.SITE_URL;
  const { error: inviteError } = await db().auth.admin.inviteUserByEmail(e, site ? { redirectTo: `${site}/admin/login` } : undefined);
  revalidatePath("/admin/staff");
  if (!inviteError) return { ok: true, invited: true };
  const exists = /already|registered|exists/i.test(inviteError.message);
  return {
    ok: true,
    invited: false,
    note: exists ? "Нэвтрэх бүртгэл аль хэдийн байгаа — шууд нэвтэрч болно." : "Урилга илгээж чадсангүй. Supabase → Authentication → Users хэсгээс бүртгэлийг үүсгэнэ үү.",
  };
}

export async function setStaffRole(email: string, role: Role): Promise<SaveResult> {
  const admin = await requireAdmin("staff.manage");
  if (!ROLES.includes(role)) return { ok: false, error: "Үүрэг буруу." };
  if (email === admin.email) return { ok: false, error: "Өөрийн үүргийг өөрчлөх боломжгүй." };
  const { data: current } = await db().from("admin_users").select("role").eq("email", email).maybeSingle();
  if (!current) return { ok: false, error: "Ажилтан олдсонгүй." };
  if (current.role === "owner" && role !== "owner" && (await ownerCount()) <= 1) return { ok: false, error: "Хамгийн багадаа нэг эзэн байх ёстой." };
  const { error } = await db().from("admin_users").update({ role }).eq("email", email);
  if (error) return { ok: false, error: "Хадгалж чадсангүй." };
  await audit(admin.email, "staff.role", { type: "staff", id: email }, { from: current.role, to: role });
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function removeStaff(email: string): Promise<SaveResult> {
  const admin = await requireAdmin("staff.manage");
  if (email === admin.email) return { ok: false, error: "Өөрийгөө хасах боломжгүй." };
  const { data: current } = await db().from("admin_users").select("role").eq("email", email).maybeSingle();
  if (!current) return { ok: false, error: "Ажилтан олдсонгүй." };
  if (current.role === "owner" && (await ownerCount()) <= 1) return { ok: false, error: "Хамгийн багадаа нэг эзэн байх ёстой." };
  const { error } = await db().from("admin_users").delete().eq("email", email);
  if (error) return { ok: false, error: "Хасаж чадсангүй." };
  await audit(admin.email, "staff.remove", { type: "staff", id: email }, { role: current.role });
  revalidatePath("/admin/staff");
  return { ok: true };
}

/* ── Documents, care form, contract ─────────────────────────────────── */

export type AdminDocs = {
  slots: (DocSlot & { id: number | null; status: DocStatus | null; note: string | null; mime: string | null; uploadedAt: string | null; check: { ok?: boolean } | null })[];
  care: Care | null;
  contract: { signedAt: string; name: string } | null;
};

/** Everything a booking has submitted; opening it decrypts the care form, so the view is logged. */
export async function adminDocuments(bookingId: string): Promise<AdminDocs> {
  const admin = await requireAdmin("passports.view");
  const { data: b } = await db().from("booking_requests").select(BOOKING_COLUMNS).eq("id", bookingId).single();
  const booking = b as BookingRow;
  const [slots, docs, care, signed] = await Promise.all([requiredSlots(booking), listDocuments(bookingId), readCare(bookingId).catch(() => null), signedContract(bookingId)]);
  if (care) await logPassportAccess(admin.email, bookingId, "care");
  return {
    slots: slots.map((s) => {
      const d = docs.find((x) => x.doc_type === s.type && x.slot === s.slot);
      return {
        ...s,
        id: d?.id ?? null,
        status: d?.status ?? null,
        note: d?.staff_note ?? null,
        mime: d?.mime ?? null,
        uploadedAt: d?.uploaded_at ?? null,
        check: (d?.check_result as { ok?: boolean } | null) ?? null,
      };
    }),
    care,
    contract: signed ? { signedAt: signed.signed_at, name: signed.signed_name } : null,
  };
}

export async function reviewDoc(id: number, status: "approved" | "rejected", note: string): Promise<SaveResult> {
  const admin = await requireAdmin("passports.view");
  if (status === "rejected" && !note.trim()) return { ok: false, error: "Дахин илгээх шалтгааныг бичнэ үү." };
  try {
    const d = await reviewDocument(id, status, note, admin.email);
    const label = docInfo(d.doc_type)?.label ?? "Баримт";
    if (status === "rejected") await postMessage(d.booking_id, "system", `«${label}» баримтыг дахин илгээнэ үү: ${note.trim()}`);
    await audit(admin.email, `document.${status}`, { type: "booking", id: d.booking_id }, { docType: d.doc_type, slot: d.slot });
  } catch {
    return { ok: false, error: "Хадгалж чадсангүй." };
  }
  return { ok: true };
}

export async function saveContractTemplate(body: string, publish: boolean): Promise<SaveResult & { version?: string }> {
  const admin = await requireAdmin("staff.manage");
  const text = body.trim().slice(0, 30_000);
  if (text.length < 200) return { ok: false, error: "Гэрээний текст хэт богино байна." };
  const open = unfilledParts(text);
  if (publish && open.length) return { ok: false, error: `Бөглөөгүй хэсэг үлдсэн байна: ${open.slice(0, 2).join(", ")}` };
  const current = await getContractTemplate();
  // Signed contracts keep their own text; a new version only affects future signatures
  const version = current.body === text && current.published === publish ? current.version : `v${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;
  await setContractTemplate({ body: text, version, published: publish }, admin.email);
  await audit(admin.email, publish ? "contract.publish" : "contract.save", { type: "contract", id: version });
  revalidatePath("/admin/contract");
  return { ok: true, version };
}

/* ── Errors ─────────────────────────────────────────────────────────── */

/** Marks every logged error with this message as handled. */
export async function resolveError(message: string): Promise<SaveResult> {
  const admin = await requireAdmin("audit.view");
  const { error } = await db().from("error_log").update({ resolved: true }).eq("message", message).eq("resolved", false);
  if (error) return { ok: false, error: "Хадгалж чадсангүй." };
  await audit(admin.email, "error.resolve", { type: "error", id: message.slice(0, 120) });
  revalidatePath("/admin/errors");
  return { ok: true };
}
