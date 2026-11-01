import { formatPrice } from "@/data/tours";
import { fitsAmount, installmentProviders, pendingInstallments } from "@/lib/server/installments";
import type { Care } from "@/lib/documents";
import { contractFor, getContractTemplate, sha256, signedContract } from "@/lib/server/contract";
import { saveCare } from "@/lib/server/documents";
import { deletePassengers, passportStorageReady, savePassengers } from "@/lib/server/passports";
import { sendLater } from "@/lib/server/push";
import { assistantReply, tripRepliesEnabled } from "@/lib/server/trip-assistant";
import { bookingFromRequest, tripView } from "@/lib/server/trip-view";
import { BOOKING_COLUMNS, db, postMessage, type BookingRow } from "@/lib/server/trips";
import { payOptions, type Passenger } from "@/lib/trips";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

/**
 * The traveller's own booking, addressed by the access token their device got when the
 * request was created (header `x-trip-token`). GET reads it; POST does one action.
 * QPay payments live in /api/payments/qpay/*.
 */

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

export async function GET(request: Request) {
  const b = await bookingFromRequest(request);
  if (!b) return fail(404, "Захиалга олдсонгүй.");
  await db().from("booking_requests").update({ traveller_seen_at: new Date().toISOString() }).eq("id", b.id);
  return Response.json(await tripView(b));
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parsePassengers(input: unknown, max: number): Passenger[] | null {
  if (!Array.isArray(input) || input.length > max) return null;
  const out: Passenger[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
    const name = str(r.name, 80).toUpperCase().replace(/\s+/g, " ");
    if (name && !/^[A-Z][A-Z .'-]+$/.test(name)) return null;
    const passport = str(r.passport, 20).toUpperCase().replace(/\s/g, "");
    if (passport && !/^[A-Z0-9]{5,20}$/.test(passport)) return null;
    const birth = str(r.birth, 10);
    const expiry = str(r.expiry, 10);
    if ((birth && !ISO_DATE.test(birth)) || (expiry && !ISO_DATE.test(expiry))) return null;
    const gender = r.gender === "M" || r.gender === "F" ? r.gender : undefined;
    out.push({ name, gender, birth: birth || undefined, passport: passport || undefined, expiry: expiry || undefined });
  }
  return out;
}

export async function POST(request: Request) {
  const b = await bookingFromRequest(request);
  if (!b) return fail(404, "Захиалга олдсонгүй.");
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "Хүсэлт буруу байна.");
  }
  const client = db();

  switch (body.action) {
    case "message": {
      const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";
      if (!text) return fail(400, "Мессеж хоосон байна.");
      const hourAgo = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await client
        .from("booking_messages")
        .select("id", { count: "exact", head: true })
        .eq("booking_id", b.id)
        .eq("sender", "traveller")
        .gt("created_at", hourAgo);
      if ((count ?? 0) >= 30) return fail(429, "Хэт олон мессеж илгээлээ. Түр хүлээгээд дахин оролдоно уу.");
      if (!(await postMessage(b.id, "traveller", text))) return fail(502, "Илгээж чадсангүй.");
      if (tripRepliesEnabled()) sendLater(() => assistantReply(b.id));
      break;
    }

    case "passengers": {
      if (b.status === "cancelled") return fail(400, "Цуцалсан захиалга.");
      if (body.consent !== true) return fail(400, "Паспортын мэдээллээ ашиглуулах зөвшөөрлөө тэмдэглэнэ үү.");
      if (!passportStorageReady()) return fail(503, "Паспортын мэдээлэл хадгалах тохиргоо хийгдээгүй байна. Манай багтай холбогдоно уу.");
      const passengers = parsePassengers(body.passengers, Math.max(1, b.adults + b.kids_own_bed + b.kids_shared_bed));
      if (!passengers) return fail(400, "Паспортын мэдээллийг латин үсгээр, зөв форматаар оруулна уу.");
      try {
        await savePassengers(b.id, passengers, b.travel_date);
      } catch (e) {
        console.error("passport save failed", e);
        return fail(502, "Хадгалж чадсангүй.");
      }
      break;
    }

    case "care": {
      if (!passportStorageReady()) return fail(503, "Хадгалах тохиргоо хийгдээгүй байна. Манай багтай холбогдоно уу.");
      const c = (body.care ?? {}) as Record<string, unknown>;
      const s = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
      const care: Care = {
        emergencyName: s(c.emergencyName, 80),
        emergencyPhone: s(c.emergencyPhone, 20),
        emergencyRelation: s(c.emergencyRelation, 40) || undefined,
        diet: s(c.diet, 300) || undefined,
        medical: s(c.medical, 500) || undefined,
        mobility: s(c.mobility, 300) || undefined,
      };
      if (care.emergencyName.length < 2) return fail(400, "Яаралтай үед холбогдох хүний нэрийг оруулна уу.");
      if (!/^[0-9+ ]{8,20}$/.test(care.emergencyPhone)) return fail(400, "Яаралтай үед холбогдох утсаа шалгана уу.");
      try {
        await saveCare(b.id, care);
      } catch (e) {
        console.error("care save failed", e);
        return fail(502, "Хадгалж чадсангүй.");
      }
      break;
    }

    case "sign": {
      if (body.accept !== true) return fail(400, "Гэрээг уншиж зөвшөөрснөө тэмдэглэнэ үү.");
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
      const signature = typeof body.signature === "string" ? body.signature : "";
      if (name.length < 2) return fail(400, "Овог нэрээ бичнэ үү.");
      if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length > 300_000) return fail(400, "Гарын үсгээ зурна уу.");
      if (await signedContract(b.id)) return fail(400, "Гэрээнд аль хэдийн гарын үсэг зурсан байна.");
      const template = await getContractTemplate();
      if (!template.published) return fail(400, "Гэрээ хараахан бэлэн болоогүй байна.");
      const text = contractFor(template, b);
      const { error } = await client.from("booking_contracts").insert({
        booking_id: b.id,
        version: template.version,
        body: text,
        body_sha256: sha256(text),
        signed_name: name,
        signature_png: signature,
        ip: (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
        user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      });
      if (error) return fail(502, "Хадгалж чадсангүй.");
      await postMessage(b.id, "system", "Аяллын гэрээнд гарын үсэг зурлаа ✍️ Гэрээгээ «Гэрээ» хэсгээс хэдийд ч харж, PDF болгон хадгалж болно.", { push: false });
      break;
    }

    case "passengers-delete": {
      await deletePassengers(b.id, "traveller");
      await postMessage(b.id, "traveller", "Паспортын мэдээллээ устгалаа.");
      break;
    }

    case "installment": {
      const providers = await installmentProviders();
      const provider = providers.find((p) => p.id === body.provider);
      const option = payOptions(b.status, Number(b.total), Number(b.deposit), Number(b.paid_amount)).find((o) => o.kind === body.kind);
      if (!provider || !option) return fail(400, "Одоогоор хуваан төлөх боломжгүй байна.");
      if (!fitsAmount(provider, option.amount)) return fail(400, `${provider.name}-ээр энэ дүнг төлөх боломжгүй.`);
      const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : b.phone;
      if (!/^[0-9+ ]{8,20}$/.test(phone)) return fail(400, "Утасны дугаараа шалгана уу.");
      if ((await pendingInstallments([b.id])).length) return fail(400, "Хуваан төлөх хүсэлт аль хэдийн илгээгдсэн байна.");

      const { error } = await client.from("payments").insert({
        id: `${b.id}-${randomBytes(3).toString("hex").toUpperCase()}`,
        booking_id: b.id,
        amount: option.amount,
        method: provider.id,
        phone,
      });
      if (error) return fail(502, "Хүсэлт илгээж чадсангүй.");
      await postMessage(
        b.id,
        "system",
        `${provider.name}-ээр ${formatPrice(option.amount)} хуваан төлөх хүсэлт хүлээн авлаа. Манай ажилтан ${phone} дугаарт ${provider.name} нэхэмжлэх илгээнэ — ${provider.name} аппаа нээж баталгаажуулаарай.`,
      );
      break;
    }

    case "installment-cancel": {
      const [open] = await pendingInstallments([b.id]);
      if (!open) return fail(400, "Цуцлах хүсэлт алга.");
      if (open.invoice_sent_at) return fail(400, "Нэхэмжлэх аль хэдийн илгээгдсэн тул манай багт чатаар хандана уу.");
      await client.from("payments").update({ status: "cancelled" }).eq("id", open.id).eq("status", "pending");
      await postMessage(b.id, "traveller", "Хуваан төлөх хүсэлтээ цуцаллаа.");
      break;
    }

    default:
      return fail(400, "Буруу үйлдэл.");
  }

  const { data: fresh } = await client.from("booking_requests").select(BOOKING_COLUMNS).eq("id", b.id).single();
  return Response.json(await tripView(fresh as BookingRow));
}
