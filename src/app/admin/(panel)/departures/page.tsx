import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import { DepartureRow, type DepartureStats } from "@/app/admin/(panel)/departures/DepartureRow";
import { tourDates, type Tour } from "@/data/tours";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/trips";
import { HOLDING_STATUSES, type TripStatus } from "@/lib/trips";

type Row = {
  tour_id: string;
  travel_date: string | null;
  status: TripStatus;
  adults: number;
  kids_own_bed: number;
  kids_shared_bed: number;
  passengers_ready: number;
  paid_amount: number;
};

export default async function AdminDeparturesPage() {
  await requireAdmin("departures.manage");
  const client = db();
  const [{ data: tourRows }, { data: deps }, { data: bookings }] = await Promise.all([
    client.from("tours").select("id, data").order("position").order("id"),
    client.from("departures").select("tour_id, date_label, capacity, closed"),
    client
      .from("booking_requests")
      .select("tour_id, travel_date, status, adults, kids_own_bed, kids_shared_bed, passengers_ready, paid_amount")
      .neq("status", "cancelled")
      .limit(5000),
  ]);
  const tours = (tourRows ?? []).map((r) => r.data as Tour);
  const rows = (bookings ?? []) as Row[];

  const groups = tours
    .map((tour) => {
      const mine = rows.filter((r) => r.tour_id === tour.id);
      const labels = [...new Set([...tourDates(tour), ...mine.map((r) => r.travel_date ?? "")])];
      if (!labels.length) labels.push("");
      const stats: DepartureStats[] = labels.map((label) => {
        const on = mine.filter((r) => (r.travel_date ?? "") === label);
        const size = (r: Row) => r.adults + r.kids_own_bed + r.kids_shared_bed;
        const sum = (list: Row[]) => list.reduce((n, r) => n + size(r), 0);
        const booked = on.filter((r) => r.status === "confirmed" || r.status === "paid");
        const dep = (deps ?? []).find((d) => d.tour_id === tour.id && d.date_label === label);
        return {
          tourId: tour.id,
          label,
          capacity: dep?.capacity ?? null,
          closed: dep?.closed ?? false,
          held: sum(on.filter((r) => HOLDING_STATUSES.includes(r.status))),
          booked: sum(booked),
          pending: sum(on.filter((r) => r.status === "new" || r.status === "contacted")),
          waitlist: sum(on.filter((r) => r.status === "waitlist")),
          passportsReady: booked.reduce((n, r) => n + r.passengers_ready, 0),
          collected: on.reduce((n, r) => n + Number(r.paid_amount), 0),
        };
      });
      return { tour, stats, hasBookings: mine.length > 0 };
    })
    .filter((g) => g.tour.status !== "ended" || g.hasBookings);

  return (
    <>
      <AdminTitle
        title="Огноо, суудал"
        sub="Суудлын тоог оруулбал сайт дээр бодит үлдэгдэл харагдана. Дүүрмэгц шинэ хүсэлт хүлээлгийн жагсаалтад орно. Шинэ, холбогдсон, баталгаажсан, төлсөн хүсэлт бүгд суудал эзэлнэ."
      />
      <div className="mt-6 space-y-5">
        {groups.map(({ tour, stats }) => (
          <section key={tour.id} className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-semibold">{tour.title}</h2>
              <p className="text-xs text-muted">{[tour.destination, tour.duration, tour.status === "ended" ? "Дууссан" : ""].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="hidden grid-cols-[minmax(9rem,1.2fr)_6rem_1fr_repeat(3,5.5rem)_auto] gap-3 px-2 pb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted lg:grid">
              <span>Огноо</span>
              <span>Суудал</span>
              <span>Дүүргэлт</span>
              <span>Хүлээгдэж</span>
              <span>Хүлээлэг</span>
              <span>Паспорт</span>
              <span />
            </div>
            <div className="space-y-2">
              {stats.map((s) => (
                <DepartureRow key={s.label} s={s} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
