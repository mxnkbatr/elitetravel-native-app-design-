import "server-only";

import { formatPrice } from "@/data/tours";
import { DRAFT_TEMPLATE, renderContract, type ContractTemplate } from "@/lib/contract";
import { db, type BookingRow } from "@/lib/server/trips";
import { createHash } from "node:crypto";

const KEY = "contract";

export async function getContractTemplate(): Promise<ContractTemplate> {
  const { data } = await db().from("app_settings").select("value").eq("key", KEY).maybeSingle();
  return (data?.value as ContractTemplate | undefined) ?? DRAFT_TEMPLATE;
}

export async function setContractTemplate(t: ContractTemplate, by: string) {
  const { error } = await db().from("app_settings").upsert({ key: KEY, value: t, updated_at: new Date().toISOString(), updated_by: by }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

/** The contract text for one booking, exactly as the traveller will see and sign it. */
export function contractFor(template: ContractTemplate, b: BookingRow) {
  const people = b.adults + b.kids_own_bed + b.kids_shared_bed;
  return renderContract(template.body, {
    booking_id: b.id,
    name: b.name,
    phone: b.phone,
    tour: b.tour_title,
    dates: b.travel_date ?? "тохиролцсон огноо",
    travellers: `${people}`,
    total: formatPrice(Number(b.total)),
    deposit: formatPrice(Number(b.deposit)),
    today: new Intl.DateTimeFormat("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
  });
}

export const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

export type SignedContract = { version: string; body: string; body_sha256: string; signed_name: string; signature_png: string; signed_at: string; ip: string | null };

export async function signedContract(bookingId: string) {
  const { data } = await db().from("booking_contracts").select("version, body, body_sha256, signed_name, signature_png, signed_at, ip").eq("booking_id", bookingId).maybeSingle();
  return (data as SignedContract | null) ?? null;
}
