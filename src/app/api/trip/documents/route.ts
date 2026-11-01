import { isDocType, MAX_UPLOAD_BYTES, UPLOAD_MIME } from "@/lib/documents";
import { storeDocument } from "@/lib/server/documents";
import { passportStorageReady } from "@/lib/server/passports";
import { bookingFromRequest, requiredSlots, tripView } from "@/lib/server/trip-view";
import { BOOKING_COLUMNS, db, type BookingRow } from "@/lib/server/trips";

export const runtime = "nodejs";

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

/** Traveller uploads one document (multipart: type, slot, file, check). Stored encrypted. Header x-trip-token. */
export async function POST(request: Request) {
  const b = await bookingFromRequest(request);
  if (!b) return fail(404, "Захиалга олдсонгүй.");
  if (b.status === "cancelled") return fail(400, "Цуцалсан захиалга.");
  if (!passportStorageReady()) return fail(503, "Баримт хадгалах тохиргоо хийгдээгүй байна. Манай багтай холбогдоно уу.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Файл уншиж чадсангүй.");
  }
  const type = form.get("type");
  const slot = Number(form.get("slot"));
  const file = form.get("file");
  if (!isDocType(type) || !Number.isInteger(slot) || !(file instanceof File)) return fail(400, "Буруу хүсэлт.");
  if (!(await requiredSlots(b)).some((s) => s.type === type && s.slot === slot)) return fail(400, "Энэ аялалд энэ баримт шаардлагагүй.");
  if (!(UPLOAD_MIME as readonly string[]).includes(file.type)) return fail(400, "Зөвхөн зураг (JPG, PNG) эсвэл PDF хуулна уу.");
  if (file.size > MAX_UPLOAD_BYTES) return fail(400, "Файл 4MB-аас их байна.");

  let check: Record<string, unknown> | null = null;
  const rawCheck = form.get("check");
  if (typeof rawCheck === "string" && rawCheck.length < 2000) {
    try {
      check = JSON.parse(rawCheck);
    } catch {
      check = null;
    }
  }

  try {
    await storeDocument({ bookingId: b.id, type, slot, bytes: new Uint8Array(await file.arrayBuffer()), mime: file.type, check });
  } catch (e) {
    console.error("document upload failed", e);
    return fail(502, "Хадгалж чадсангүй. Дахин оролдоно уу.");
  }
  const { data } = await db().from("booking_requests").select(BOOKING_COLUMNS).eq("id", b.id).single();
  return Response.json(await tripView(data as BookingRow));
}
