import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import { InstallmentActions } from "@/app/admin/(panel)/payments/InstallmentActions";
import { ProviderSettings } from "@/app/admin/(panel)/payments/ProviderSettings";
import { RetryReceipt } from "@/app/admin/(panel)/payments/RetryReceipt";
import { ebarimtMode } from "@/lib/server/ebarimt";
import { qpayMode } from "@/lib/server/qpay";
import { formatPrice } from "@/data/tours";
import { requireAdmin } from "@/lib/server/auth";
import { installmentProviders, pendingInstallments, toRequest } from "@/lib/server/installments";
import { db } from "@/lib/server/trips";
import { PAYMENT_METHOD_LABEL } from "@/lib/trips";

const when = (iso: string) =>
  new Intl.DateTimeFormat("mn-MN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default async function AdminPaymentsPage() {
  await requireAdmin("money.manage");
  const [queue, providers, { data: recent }, { data: receiptRows }] = await Promise.all([
    pendingInstallments(),
    installmentProviders(false),
    db().from("payments").select("id, booking_id, amount, method, paid_at").eq("status", "paid").order("paid_at", { ascending: false }).limit(30),
    db().from("receipts").select("payment_id, status, bill_id, provider, error"),
  ]);
  const receipt = (paymentId: string) => (receiptRows ?? []).find((r) => r.payment_id === paymentId);
  const openReceipts = (receiptRows ?? []).filter((r) => r.status !== "issued").length;
  const qpay = qpayMode();
  const ebarimt = ebarimtMode();
  const ids = [...new Set([...queue.map((q) => q.booking_id), ...(recent ?? []).map((r) => r.booking_id)])];
  const { data: bookings } = ids.length
    ? await db().from("booking_requests").select("id, name, phone, tour_title, travel_date, total, paid_amount").in("id", ids)
    : { data: [] };
  const booking = (id: string) => (bookings ?? []).find((b) => b.id === id);

  return (
    <>
      <AdminTitle
        title="Төлбөр"
        sub="QPay төлбөр автоматаар бүртгэгдэнэ. Хуваан төлөх хүсэлтэд тухайн аппын merchant самбараас нэхэмжлэх илгээгээд «Нэхэмжлэх илгээсэн», мөнгө ормогц «Төлөгдсөн» дарна."
      />

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className={`rounded-full px-3 py-1.5 ${qpay === "live" ? "bg-emerald-100 text-emerald-800" : qpay === "mock" ? "bg-amber-100 text-amber-800" : "bg-zinc-200 text-zinc-600"}`}>
          QPay: {qpay === "live" ? "холбогдсон" : qpay === "mock" ? "туршилтын горим (mock)" : "унтраалттай"}
        </span>
        <span className={`rounded-full px-3 py-1.5 ${ebarimt === "posapi" ? "bg-emerald-100 text-emerald-800" : ebarimt === "mock" ? "bg-amber-100 text-amber-800" : "bg-zinc-200 text-zinc-600"}`}>
          И-баримт: {ebarimt === "posapi" ? "PosAPI 3.0" : ebarimt === "mock" ? "туршилтын горим (mock)" : "унтраалттай — баримтууд хүлээгдэж байна"}
        </span>
        {openReceipts ? <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-700">Гараагүй баримт: {openReceipts}</span> : null}
      </div>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold">Хүлээгдэж буй хүсэлт ({queue.length})</h2>
        <div className="mt-3 space-y-2">
          {queue.length === 0 ? <p className="rounded-2xl bg-white p-6 text-center text-sm text-muted">Хүсэлт алга.</p> : null}
          {queue.map((q) => {
            const b = booking(q.booking_id);
            return (
              <article key={q.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                  <span className="font-mono text-xs text-muted">{q.booking_id}</span>
                  <span className="font-semibold">{b?.name}</span>
                  <span className="text-muted">{b?.tour_title}</span>
                  <span className="text-muted">{b?.travel_date}</span>
                  <span className="ml-auto text-xs text-muted">{when(q.created_at)}</span>
                </div>
                <InstallmentActions r={toRequest(q)} />
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Хуваан төлөх аппууд</h2>
        <p className="mt-1 text-xs text-muted">Идэвхтэй, дүн нь тохирох аппууд л аялагчид харагдана.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {providers.map((p) => (
            <ProviderSettings key={p.id} p={p} />
          ))}
        </div>
      </section>

      <section className="mt-8 overflow-x-auto rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="font-display text-xl font-semibold">Сүүлийн төлбөрүүд</h2>
        <table className="mt-3 w-full min-w-[36rem] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-[var(--line)]">
              <th className="py-2 pr-3">Огноо</th>
              <th className="py-2 pr-3">Захиалга</th>
              <th className="py-2 pr-3">Аялагч</th>
              <th className="py-2 pr-3">Арга</th>
              <th className="py-2 pr-3 text-right">Дүн</th>
              <th className="py-2">И-баримт</th>
            </tr>
          </thead>
          <tbody>
            {(recent ?? []).map((r) => (
              <tr key={r.id} className="border-b border-[var(--line)] last:border-0">
                <td className="py-2 pr-3 text-muted">{r.paid_at ? when(r.paid_at) : "—"}</td>
                <td className="py-2 pr-3 font-mono text-xs">{r.booking_id}</td>
                <td className="py-2 pr-3">{booking(r.booking_id)?.name}</td>
                <td className="py-2 pr-3">{PAYMENT_METHOD_LABEL[r.method] ?? r.method}</td>
                <td className="py-2 pr-3 text-right font-num">{formatPrice(Number(r.amount))}</td>
                <td className="py-2 text-xs">
                  {(() => {
                    const rc = receipt(r.id);
                    if (!rc) return <RetryReceipt paymentId={r.id} />;
                    if (rc.status === "issued") return <span className="font-mono text-emerald-700">{rc.provider === "mock" ? "mock · " : ""}{rc.bill_id}</span>;
                    return (
                      <span className="flex items-center gap-2">
                        <span className={rc.status === "failed" ? "text-red-600" : "text-amber-700"} title={rc.error ?? undefined}>
                          {rc.status === "failed" ? "Алдаа" : "Хүлээгдэж"}
                        </span>
                        <RetryReceipt paymentId={r.id} />
                      </span>
                    );
                  })()}
                </td>
              </tr>
            ))}
            {(recent ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted">
                  Төлбөр алга.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
