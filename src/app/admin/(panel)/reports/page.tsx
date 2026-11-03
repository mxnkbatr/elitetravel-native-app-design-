import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import { formatPrice } from "@/data/tours";
import { Traffic } from "@/app/admin/(panel)/reports/Traffic";
import { siteStats } from "@/lib/server/analytics";
import { requireAdmin } from "@/lib/server/auth";
import { getTours } from "@/lib/server/content";
import { db } from "@/lib/server/trips";
import { PAYMENT_METHOD_LABEL, type TripStatus } from "@/lib/trips";

type Row = {
  created_at: string;
  tour_id: string;
  tour_title: string;
  status: TripStatus;
  total: number;
  paid_amount: number;
  adults: number;
  kids_own_bed: number;
  kids_shared_bed: number;
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const won = (r: Row) => r.status === "confirmed" || r.status === "paid";
const size = (r: Row) => r.adults + r.kids_own_bed + r.kids_shared_bed;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

export default async function AdminReportsPage() {
  await requireAdmin("reports.view");
  const client = db();
  const [{ data: bookingRows }, { data: paymentRows }] = await Promise.all([
    client
      .from("booking_requests")
      .select("created_at, tour_id, tour_title, status, total, paid_amount, adults, kids_own_bed, kids_shared_bed")
      .order("created_at", { ascending: false })
      .limit(10000),
    client.from("payments").select("amount, paid_at, method").eq("status", "paid").limit(10000),
  ]);
  const rows = ((bookingRows ?? []) as Row[]).map((r) => ({ ...r, total: Number(r.total), paid_amount: Number(r.paid_amount) }));
  const payments = (paymentRows ?? []).map((p) => ({ amount: Number(p.amount), at: p.paid_at as string, method: p.method as string }));

  const now = new Date();
  const thisMonth = monthKey(now);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = monthKey(prev);
  const inMonth = (iso: string, key: string) => monthKey(new Date(iso)) === key;

  const decided = rows.filter((r) => r.status !== "waitlist");
  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const collectedMonth = payments.filter((p) => p.at && inMonth(p.at, thisMonth)).reduce((s, p) => s + p.amount, 0);
  const receivable = rows.filter(won).reduce((s, r) => s + Math.max(0, r.total - r.paid_amount), 0);
  const requestsMonth = rows.filter((r) => inMonth(r.created_at, thisMonth)).length;
  const requestsLast = rows.filter((r) => inMonth(r.created_at, lastMonth)).length;

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = monthKey(d);
    const mine = rows.filter((r) => inMonth(r.created_at, key));
    return {
      key,
      label: new Intl.DateTimeFormat("mn-MN", { month: "short" }).format(d),
      requests: mine.length,
      won: mine.filter(won).length,
      collected: payments.filter((p) => p.at && inMonth(p.at, key)).reduce((s, p) => s + p.amount, 0),
    };
  });
  const maxCollected = Math.max(1, ...months.map((m) => m.collected));
  const maxRequests = Math.max(1, ...months.map((m) => m.requests));

  const byTour = [...new Set(rows.map((r) => r.tour_id))]
    .map((id) => {
      const mine = rows.filter((r) => r.tour_id === id);
      const booked = mine.filter(won);
      return {
        id,
        title: mine[0].tour_title,
        requests: mine.length,
        people: booked.reduce((n, r) => n + size(r), 0),
        conversion: pct(booked.length, mine.filter((r) => r.status !== "waitlist").length),
        revenue: booked.reduce((s, r) => s + r.total, 0),
        collected: mine.reduce((s, r) => s + r.paid_amount, 0),
        waitlist: mine.filter((r) => r.status === "waitlist").reduce((n, r) => n + size(r), 0),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const byMethod = Object.entries(
    payments.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.method]: (acc[p.method] ?? 0) + p.amount }), {}),
  ).sort((a, b) => b[1] - a[1]);

  // Site traffic for the last 30 days, Ulaanbaatar calendar days
  const trafficTo = new Date();
  const trafficFrom = new Date(trafficTo.getTime() - 30 * 86400_000);
  const ubDay = (d: Date) => new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
  const trafficDays = Array.from({ length: 30 }, (_, i) => ubDay(new Date(trafficFrom.getTime() + (i + 1) * 86400_000)));
  const [traffic, tours] = await Promise.all([siteStats(trafficFrom, trafficTo), getTours()]);
  const recent = rows.filter((r) => new Date(r.created_at) >= trafficFrom);

  return (
    <>
      <AdminTitle title="Тайлан" sub="Сайтын хандалт, хүсэлт, хөрвөлт, орлого. Цуцалсан захиалга орлогод орохгүй." />

      <Traffic
        stats={traffic}
        days={trafficDays}
        requests={recent.length}
        paid={recent.filter((r) => r.paid_amount > 0).length}
        titles={Object.fromEntries(tours.map((t) => [t.id, t.title]))}
      />

      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Энэ сарын хүсэлт" value={String(requestsMonth)} sub={`Өмнөх сар: ${requestsLast}`} />
        <Kpi label="Хөрвөлт (хүсэлт → баталгаа)" value={pct(decided.filter(won).length, decided.length)} sub={`${decided.filter(won).length} / ${decided.length} хүсэлт`} />
        <Kpi label="Энэ сард төлөгдсөн" value={formatPrice(collectedMonth)} sub={`Нийт: ${formatPrice(collected)}`} />
        <Kpi label="Авлага (баталгаажсан)" value={formatPrice(receivable)} sub="Төлөгдөөгүй үлдэгдэл" />
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Сар бүрийн хүсэлт</h2>
          <Bars items={months.map((m) => ({ label: m.label, value: m.requests, sub: `${m.won} батал.`, ratio: m.requests / maxRequests }))} />
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Сар бүрийн орлого</h2>
          <Bars items={months.map((m) => ({ label: m.label, value: m.collected ? `${Math.round(m.collected / 1_000_000)}сая` : "0", sub: "", ratio: m.collected / maxCollected }))} />
          <p className="mt-3 text-xs text-muted">
            {byMethod.length ? byMethod.map(([m, sum]) => `${PAYMENT_METHOD_LABEL[m] ?? m}: ${formatPrice(sum)}`).join(" · ") : "Төлбөр алга"}
          </p>
        </div>
      </section>

      <section className="mt-6 overflow-x-auto rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="font-display text-xl font-semibold">Аялал тус бүрээр</h2>
        <table className="mt-3 w-full min-w-[44rem] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-[var(--line)]">
              <th className="py-2 pr-3">Аялал</th>
              <th className="py-2 pr-3 text-right">Хүсэлт</th>
              <th className="py-2 pr-3 text-right">Хөрвөлт</th>
              <th className="py-2 pr-3 text-right">Баталгаажсан хүн</th>
              <th className="py-2 pr-3 text-right">Хүлээлэг</th>
              <th className="py-2 pr-3 text-right">Борлуулалт</th>
              <th className="py-2 text-right">Төлөгдсөн</th>
            </tr>
          </thead>
          <tbody>
            {byTour.map((t) => (
              <tr key={t.id} className="border-b border-[var(--line)] last:border-0">
                <td className="py-2 pr-3 font-semibold">{t.title}</td>
                <td className="py-2 pr-3 text-right">{t.requests}</td>
                <td className="py-2 pr-3 text-right">{t.conversion}</td>
                <td className="py-2 pr-3 text-right">{t.people}</td>
                <td className={`py-2 pr-3 text-right ${t.waitlist ? "font-semibold text-violet-700" : ""}`}>{t.waitlist}</td>
                <td className="py-2 pr-3 text-right font-num">{formatPrice(t.revenue)}</td>
                <td className="py-2 text-right font-num text-emerald-700">{formatPrice(t.collected)}</td>
              </tr>
            ))}
            {byTour.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted">
                  Мэдээлэл алга.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-2 truncate font-num text-2xl leading-none sm:text-3xl">{value}</p>
      <p className="mt-2 text-xs text-muted">{sub}</p>
    </div>
  );
}

function Bars({ items }: { items: { label: string; value: number | string; sub: string; ratio: number }[] }) {
  return (
    <div className="mt-4 flex h-44 items-end gap-3">
      {items.map((m) => (
        <div key={m.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-xs font-semibold">{m.value}</span>
          <div className="w-full rounded-t-lg bg-accent/80" style={{ height: `${Math.max(2, m.ratio * 70)}%` }} />
          <span className="text-[0.7rem] text-muted">{m.label}</span>
          {m.sub ? <span className="text-[0.6rem] text-muted">{m.sub}</span> : null}
        </div>
      ))}
    </div>
  );
}
