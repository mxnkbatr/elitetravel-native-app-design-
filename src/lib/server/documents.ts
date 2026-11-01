import "server-only";

import type { Care, DocStatus, DocType } from "@/lib/documents";
import { decrypt, decryptBytes, encrypt, encryptBytes } from "@/lib/server/passports";
import { db } from "@/lib/server/trips";
import { randomBytes } from "node:crypto";

const BUCKET = "documents";

export type DocumentRow = {
  id: number;
  booking_id: string;
  doc_type: DocType;
  slot: number;
  storage_path: string;
  mime: string;
  size: number;
  status: DocStatus;
  staff_note: string | null;
  check_result: Record<string, unknown> | null;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

const COLUMNS = "id, booking_id, doc_type, slot, storage_path, mime, size, status, staff_note, check_result, uploaded_at, reviewed_at, reviewed_by";

export async function listDocuments(bookingId: string) {
  const { data } = await db().from("booking_documents").select(COLUMNS).eq("booking_id", bookingId).order("doc_type").order("slot");
  return (data ?? []) as DocumentRow[];
}

/** Encrypts and stores one file; a re-upload for the same slot replaces the old file and resets review. */
export async function storeDocument(o: { bookingId: string; type: DocType; slot: number; bytes: Uint8Array; mime: string; check?: Record<string, unknown> | null }) {
  const client = db();
  const path = `${o.bookingId}/${o.type}-${o.slot}-${randomBytes(6).toString("hex")}.bin`;
  const { error: uploadError } = await client.storage.from(BUCKET).upload(path, encryptBytes(o.bytes), { contentType: "application/octet-stream", upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: old } = await client.from("booking_documents").select("storage_path").eq("booking_id", o.bookingId).eq("doc_type", o.type).eq("slot", o.slot).maybeSingle();
  const { error } = await client.from("booking_documents").upsert(
    {
      booking_id: o.bookingId,
      doc_type: o.type,
      slot: o.slot,
      storage_path: path,
      mime: o.mime,
      size: o.bytes.byteLength,
      status: "pending",
      staff_note: null,
      check_result: o.check ?? null,
      uploaded_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
    },
    { onConflict: "booking_id,doc_type,slot" },
  );
  if (error) {
    await client.storage.from(BUCKET).remove([path]);
    throw new Error(error.message);
  }
  if (old?.storage_path) await client.storage.from(BUCKET).remove([old.storage_path]);
}

/** Decrypted file for staff viewing (callers log the access). */
export async function readDocument(id: number) {
  const client = db();
  const { data: row } = await client.from("booking_documents").select(COLUMNS).eq("id", id).maybeSingle();
  if (!row) return null;
  const { data: blob, error } = await client.storage.from(BUCKET).download(row.storage_path);
  if (error || !blob) throw new Error(error?.message ?? "download failed");
  return { row: row as DocumentRow, bytes: decryptBytes(new Uint8Array(await blob.arrayBuffer())) };
}

export async function reviewDocument(id: number, status: "approved" | "rejected", note: string, by: string) {
  const { data, error } = await db()
    .from("booking_documents")
    .update({ status, staff_note: note.trim().slice(0, 500) || null, reviewed_at: new Date().toISOString(), reviewed_by: by })
    .eq("id", id)
    .select("booking_id, doc_type, slot")
    .single();
  if (error) throw new Error(error.message);
  return data as { booking_id: string; doc_type: DocType; slot: number };
}

/** Removes every stored file of a booking (used when its personal data is deleted). */
export async function deleteDocuments(bookingId: string) {
  const rows = await listDocuments(bookingId);
  if (rows.length) await db().storage.from(BUCKET).remove(rows.map((r) => r.storage_path));
  await db().from("booking_documents").delete().eq("booking_id", bookingId);
}

/* ── Care form (emergency contact, diet, medical) ─────────────────── */

export async function saveCare(bookingId: string, care: Care) {
  const { error } = await db().from("booking_requests").update({ care_enc: encrypt(care), care_done: true, updated_at: new Date().toISOString() }).eq("id", bookingId);
  if (error) throw new Error(error.message);
}

export async function readCare(bookingId: string): Promise<Care | null> {
  const { data } = await db().from("booking_requests").select("care_enc").eq("id", bookingId).maybeSingle();
  return data?.care_enc ? decrypt<Care>(data.care_enc) : null;
}
