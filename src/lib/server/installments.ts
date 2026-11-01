import "server-only";

import { db } from "@/lib/server/trips";
import { INSTALLMENT_PROVIDERS, type InstallmentProvider, type InstallmentProviderId, type InstallmentRequest } from "@/lib/trips";

/** Every partner with its admin settings; `enabledOnly` drops the switched-off ones. */
export async function installmentProviders(enabledOnly = true): Promise<(InstallmentProvider & { enabled: boolean })[]> {
  const { data } = await db().from("payment_providers").select("id, enabled, min_amount, max_amount, terms");
  return INSTALLMENT_PROVIDERS.map((p) => {
    const row = (data ?? []).find((r) => r.id === p.id);
    return {
      ...p,
      enabled: row?.enabled ?? false,
      min: row?.min_amount == null ? null : Number(row.min_amount),
      max: row?.max_amount == null ? null : Number(row.max_amount),
      terms: row?.terms ?? null,
    };
  }).filter((p) => !enabledOnly || p.enabled);
}

export function fitsAmount(p: Pick<InstallmentProvider, "min" | "max">, amount: number) {
  return (p.min == null || amount >= p.min) && (p.max == null || amount <= p.max);
}

type PendingRow = { id: string; booking_id: string; method: string; amount: number; phone: string | null; invoice_sent_at: string | null; created_at: string };

export const toRequest = (r: PendingRow): InstallmentRequest => ({
  id: r.id,
  provider: r.method as InstallmentProviderId,
  amount: Number(r.amount),
  phone: r.phone,
  sent: r.invoice_sent_at != null,
  at: r.created_at,
});

/** Open pay-later requests, optionally for some bookings only. */
export async function pendingInstallments(bookingIds?: string[]) {
  let query = db()
    .from("payments")
    .select("id, booking_id, method, amount, phone, invoice_sent_at, created_at")
    .eq("status", "pending")
    .neq("method", "qpay")
    .order("created_at");
  if (bookingIds) query = query.in("booking_id", bookingIds);
  const { data } = await query;
  return (data ?? []) as PendingRow[];
}
