import { SOURCE_LABEL } from "@/lib/analytics";
import type { SiteStats } from "@/lib/server/analytics";

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const DEVICE_LABEL: Record<string, string> = { phone: "Утас", tablet: "Таблет", desktop: "Компьютер", app: "Апп", unknown: "Бусад" };

/** Visits, the booking funnel and where visitors come from (last 30 days). */
export function Traffic({
  stats,
  days,
  requests,
  paid,
  titles,
}: {
  stats: SiteStats;
  days: string[];
  /** Booking requests and paid bookings created in the same period (from the bookings table) */
  requests: number;
  paid: number;
  titles: Record<string, string>;
}) {
  const daily = days.map((day) => stats.daily.find((d) => d.day === day) ?? { day, visitors: 0, views: 0 });
  const maxDaily = Math.max(1, ...daily.map((d) => d.visitors));
  const f = stats.funnel;
  const steps = [
    { label: "Сайтад орсон", n: f.visitors },
    { label: "Аялал үзсэн", n: f.tour_viewers },
    { label: "Захиалгын маягт нээсэн", n: f.booking_openers },
    { label: "Нэр, утсаа бөглөх хэсэгт хүрсэн", n: f.contact_reachers },
    { label: "Захиалга илгээсэн", n: f.booking_submitters },
    { label: "Төлбөр эхлүүлсэн", n: f.pay_openers },
  ];
  // The step that loses the most people from the one before it gets called out (once there is enough traffic)
  const drops = steps.map((s, i) => (i && steps[i - 1].n ? 1 - s.n / steps[i - 1].n : 0));
  const worst = f.visitors >= 20 ? drops.indexOf(Math.max(...drops)) : -1;
  const deviceTotal = Object.values(stats.devices).reduce((s, n) => s + n, 0);
  const devices = Object.entries(stats.devices).sort((a, b) => b[1] - a[1]);

  return (
    <section className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Зочин (30 хоног)" value={String(stats.visitors)} sub={`${stats.sessions} айлчлал · ${stats.pageviews} хуудас`} />
        {/* Requests come from the bookings table; the rate uses tracked visitors who sent one (same source as the visitor count) */}
        <Kpi label="Захиалга илгээсэн" value={String(requests)} sub={`Зочдын ${pct(f.booking_submitters, stats.visitors)} нь захиалсан`} />
        <Kpi label="Төлбөр хийсэн захиалга" value={String(paid)} sub={`Хүсэлтийн ${pct(paid, requests)}`} />
        <Kpi
          label="Ихэвчлэн ашигласан"
          value={devices.length ? (DEVICE_LABEL[devices[0][0]] ?? devices[0][0]) : "—"}
          sub={devices.map(([d, n]) => `${DEVICE_LABEL[d] ?? d} ${pct(n, deviceTotal)}`).join(" · ") || "Төхөөрөмжийн мэдээлэл алга"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Өдөр бүрийн зочин</h2>
          <div className="mt-4 flex h-36 items-end gap-[3px]">
            {daily.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${d.day}: ${d.visitors} зочин, ${d.views} хуудас`}>
                <div className="w-full rounded-t bg-accent/75 group-hover:bg-accent" style={{ height: `${Math.max(2, (d.visitors / maxDaily) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[0.65rem] text-muted">
            <span>{days[0]?.slice(5)}</span>
            <span>{days[days.length - 1]?.slice(5)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Захиалгын зам</h2>
          <div className="mt-4 space-y-2.5">
            {steps.map((s, i) => (
              <div key={s.label}>
                {i ? (
                  <p className={`mb-1 text-[0.65rem] ${i === worst ? "font-semibold text-[#c2410c]" : "text-muted"}`}>
                    ↓ {pct(steps[i - 1].n - s.n, steps[i - 1].n)} энд гарсан{i === worst ? " · хамгийн их уналт" : ""}
                  </p>
                ) : null}
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">{s.label}</span>
                  <span className="text-muted">
                    {s.n} · {pct(s.n, f.visitors)}
                  </span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/[0.05]">
                  <div
                    className={`h-full rounded-full ${i === worst ? "bg-[#c2410c]" : "bg-accent"}`}
                    style={{ width: `${f.visitors ? Math.max(1, (s.n / f.visitors) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {f.booking_errors ? (
            <p className="mt-3 text-xs text-muted">
              Илгээх үед {f.booking_errors} удаа буцаагдсан (утас, нэр буруу гэх мэт). Олон бол маягтын тайлбарыг тодруулах хэрэгтэй.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Хаанаас ирсэн</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-[var(--line)]">
                <th className="py-2 pr-3">Эх сурвалж</th>
                <th className="py-2 pr-3 text-right">Зочин</th>
                <th className="py-2 text-right">Захиалсан</th>
              </tr>
            </thead>
            <tbody>
              {stats.sources.map((s) => (
                <tr key={s.source} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-2 pr-3 font-semibold">{SOURCE_LABEL[s.source] ?? s.source}</td>
                  <td className="py-2 pr-3 text-right">{s.visitors}</td>
                  <td className="py-2 text-right">
                    {s.submitters} <span className="text-xs text-muted">({pct(s.submitters, s.visitors)})</span>
                  </td>
                </tr>
              ))}
              {stats.sources.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted">
                    Мэдээлэл алга.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <p className="mt-3 text-[0.7rem] text-muted">Instagram, Facebook-т тавих холбоосонд ?utm_source=instagram&amp;utm_campaign=bali гэж нэмбэл аль пост үр дүнтэйг ялгана.</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Аялал тус бүрийн сонирхол</h2>
          <table className="mt-3 w-full min-w-[26rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-[var(--line)]">
                <th className="py-2 pr-3">Аялал</th>
                <th className="py-2 pr-3 text-right">Үзсэн</th>
                <th className="py-2 pr-3 text-right">Маягт</th>
                <th className="py-2 text-right">Захиалсан</th>
              </tr>
            </thead>
            <tbody>
              {stats.tours.map((t) => (
                <tr key={t.tour_id} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-2 pr-3 font-semibold">{titles[t.tour_id] ?? t.tour_id}</td>
                  <td className="py-2 pr-3 text-right">{t.viewers}</td>
                  <td className="py-2 pr-3 text-right">{t.openers}</td>
                  <td className="py-2 text-right">
                    {t.submitters} <span className="text-xs text-muted">({pct(t.submitters, t.viewers)})</span>
                  </td>
                </tr>
              ))}
              {stats.tours.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted">
                    Мэдээлэл алга.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-2 font-num text-3xl leading-none">{value}</p>
      <p className="mt-2 text-xs text-muted">{sub}</p>
    </div>
  );
}
