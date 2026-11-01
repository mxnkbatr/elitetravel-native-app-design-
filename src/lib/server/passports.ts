import "server-only";

import { departureOf } from "@/lib/dates";
import { db } from "@/lib/server/trips";
import { passengerIssue, type Passenger } from "@/lib/trips";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Passport details are personal data (Хувь хүний мэдээлэл хамгаалах тухай хууль, 8-р зүйл — consent).
 * Stored only encrypted with AES-256-GCM; the key (PASSPORT_ENCRYPTION_KEY, 32 bytes base64) lives in env.
 * Losing the key makes stored passports unreadable — keep a copy in the team's password manager.
 */

/** Bump when the consent text shown to travellers changes. */
export const CONSENT_VERSION = "2026-10-31";

function key() {
  const raw = process.env.PASSPORT_ENCRYPTION_KEY;
  const k = raw ? Buffer.from(raw, "base64") : null;
  if (!k || k.length !== 32) throw new Error("PASSPORT_ENCRYPTION_KEY must be 32 bytes, base64");
  return k;
}

export function passportStorageReady() {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encrypt(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(".");
}

export function decrypt<T>(payload: string): T {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1") throw new Error("unknown passport payload version");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8")) as T;
}

/** Files (documents): [1 version byte][12 iv][16 tag][ciphertext], same key as passports. */
export function encryptBytes(data: Uint8Array) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), body]);
}

export function decryptBytes(data: Uint8Array) {
  const buf = Buffer.from(data);
  if (buf[0] !== 1) throw new Error("unknown document payload version");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(1, 13));
  decipher.setAuthTag(buf.subarray(13, 29));
  return Buffer.concat([decipher.update(buf.subarray(29)), decipher.final()]);
}

/** Decrypted passengers of one booking. Rows saved before encryption are read from the old column. */
export async function readPassengers(bookingId: string): Promise<Passenger[]> {
  const { data } = await db().from("booking_requests").select("passengers_enc, passengers").eq("id", bookingId).maybeSingle();
  if (!data) return [];
  if (data.passengers_enc) return decrypt<Passenger[]>(data.passengers_enc);
  return Array.isArray(data.passengers) ? (data.passengers as Passenger[]) : [];
}

export async function savePassengers(bookingId: string, passengers: Passenger[], travelDate: string | null) {
  const ready = passengers.filter((p) => !passengerIssue(p, travelDate)).length;
  const { error } = await db()
    .from("booking_requests")
    .update({
      passengers_enc: encrypt(passengers),
      passengers: [],
      passengers_count: passengers.filter((p) => p.name || p.passport).length,
      passengers_ready: ready,
      passport_consent_at: new Date().toISOString(),
      passport_consent_version: CONSENT_VERSION,
      passengers_deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  if (error) throw new Error(error.message);
}

export async function deletePassengers(bookingId: string, actor: string, action: "delete" | "purge" = "delete") {
  await db()
    .from("booking_requests")
    .update({ passengers_enc: null, passengers: [], passengers_count: 0, passengers_ready: 0, passengers_deleted_at: new Date().toISOString() })
    .eq("id", bookingId);
  await logPassportAccess(actor, bookingId, action);
}

/** Personal-data access log: passports, uploaded documents and the care form. */
export async function logPassportAccess(actor: string, bookingId: string | null, action: "view" | "export" | "delete" | "purge" | "document" | "care") {
  const { error } = await db().from("passport_access_log").insert({ actor, booking_id: bookingId, action });
  if (error) console.error("passport access log failed", error.code, error.message);
}

/**
 * Deletes passport details and the care form PASSPORT_RETENTION_DAYS after departure (unset = keep
 * until deleted by hand). Returns the bookings purged so their uploaded files can be removed too.
 * TODO(confirm with provider): the legally required / allowed retention period is unconfirmed.
 */
export async function purgeExpiredPassports() {
  const days = Number(process.env.PASSPORT_RETENTION_DAYS);
  if (!Number.isFinite(days) || days <= 0) return [];
  const { data } = await db()
    .from("booking_requests")
    .select("id, travel_date, created_at, passengers_enc, care_enc")
    .or("passengers_enc.not.is.null,care_enc.not.is.null")
    .limit(1000);
  const purged: string[] = [];
  for (const b of data ?? []) {
    // Anchor on the booking date so a departure is not mistaken for next year's
    const dep = departureOf(b.travel_date ?? undefined, new Date(b.created_at)) ?? new Date(b.created_at);
    if (Date.now() > dep.getTime() + days * 86400_000) {
      if (b.passengers_enc) await deletePassengers(b.id, "retention", "purge");
      if (b.care_enc) await db().from("booking_requests").update({ care_enc: null, care_done: false }).eq("id", b.id);
      purged.push(b.id);
    }
  }
  return purged;
}
