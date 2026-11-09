import { Icon } from "@/components/Icon";
import { AdminTitle, titleActionClass } from "@/app/admin/(panel)/AdminTitle";
import { Broadcast } from "@/app/admin/(panel)/departures/[tour]/Broadcast";
import { ManualBookingForm } from "@/app/admin/(panel)/ManualBookingForm";
import { formatPrice, tourDates, type Tour } from "@/data/tours";
import { can } from "@/lib/permissions";
import { requireAdmin } from "@/lib/server/auth";
import { departureBookings } from "@/lib/server/manifest";
import { BOOKING_COLUMNS, db, type BookingRow } from "@/lib/server/trips";
import { STATUS_LABEL } from "@/lib/trips";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminDeparturePage({ params, searchParams }: PageProps<"/admin/departures/[tour]">) {
  const admin = await requireAdmin("departures.manage");
  const { tour: tourId } = await params;
  const { date } = await searchParams;
  const label = typeof date === "string" ? date : "";

  const [{ data: tourRow }, bookings] = await Promise.all([
    db().from("tours").select("data").eq("id", tourId).maybeSingle(),
    label
      ? departureBookings(tourId, label)
      : db()
          .from("booking_requests")
          .select(BOOKING_COLUMNS)
          .eq("tour_id", tourId)
          .order("created_at")
          .then((r) => (r.data ?? []) as BookingRow[]),
  ]);
  if (!tourRow) notFound();
  const tour = tourRow.data as Tour;
  const rows = bookings;
  const live = rows.filter((b) => b.status !== "cancelled");
  const people = live.reduce((n, b) => n + b.adults + b.kids_own_bed + b.kids_shared_bed, 0);
  const query = label ? `?date=${encodeURIComponent(label)}` : "";
  const dates = tourDates(tour);

  const groups = label
    ? [{ date: label, items: rows }]
    : [...new Set(rows.map((b) => b.travel_date ?? ""))].sort().map((d) => ({
        date: d,
        items: rows.filter((b) => (b.travel_date ?? "") === d),
      }));

  return (
    <div className="mx-auto max-w-5xl pb-8">
      <Link href="/admin/departures" className="mb-2 inline-flex text-sm font-semibold text-accent">
        ‹ Огноо, суудал
      </Link>
      <AdminTitle
        title={tour.title}
        sub={label ? `${label} · ${live.length} захиалга · ${people} хүн` : `Бүх огноо · ${live.length} захиалга · ${people} хүн`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ManualBookingForm
              tours={[tour]}
              presetTourId={tour.id}
              presetDate={label || dates[0]}
              canManage={can(admin.role, "bookings.manage")}
            />
            {label ? (
              <a href={`/admin/departures/${tourId}/export${query}`} className={titleActionClass}>
                <Icon name="upload" size={15} className="mr-1.5 inline -mt-0.5 rotate-180" />Excel
              </a>
            ) : null}
          </div>
        }
      />

      {!label && dates.length > 1 ? (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <Link href={`/admin/departures/${tourId}`} className="shrink-0 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-white">
            Бүгд
          </Link>
          {dates.map((d) => (
            <Link
              key={d}
              href={`/admin/departures/${tourId}?date=${encodeURIComponent(d)}`}
              className="shrink-0 rounded-full border border-[var(--line)] bg-white px-3.5 py-2 text-xs font-semibold"
            >
              {d}
            </Link>
          ))}
        </div>
      ) : null}

      {label ? <Broadcast tourId={tourId} label={label} recipients={live.length} /> : null}

      <div className="mt-5 space-y-6">
        {rows.length === 0 ? (
          <div className="rounded-[1.4rem] border border-dashed border-[var(--line)] bg-white px-5 py-12 text-center">
            <p className="font-display text-xl font-semibold">Аялагч алга</p>
            <p className="mt-1.5 text-sm text-muted">Дээрх «Аялагч нэмэх»-ээр гар аргаар бүртгэж болно.</p>
          </div>
        ) : null}

        {groups.map((g) => (
          <section key={g.date || "none"}>
            {!label && g.items.length ? (
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">{g.date || "Огноогүй"}</h2>
                {g.date ? (
                  <Link href={`/admin/departures/${tourId}?date=${encodeURIComponent(g.date)}`} className="text-xs font-semibold text-accent">
                    Дэлгэрэнгүй →
                  </Link>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2.5">
              {g.items.map((b) => {
                const size = b.adults + b.kids_own_bed + b.kids_shared_bed;
                const ready = b.passengers_ready >= size;
                return (
                  <Link
                    key={b.id}
                    href={`/admin?q=${encodeURIComponent(b.id)}&tab=people`}
                    className={`flex items-center gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white p-3.5 transition active:scale-[0.99] ${b.status === "cancelled" ? "opacity-50" : ""}`}
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#062a2a] text-base font-semibold text-[#f3e0c2]">
                      {b.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">{b.name}</p>
                        <span className="rounded-full bg-[#f3f6f5] px-2 py-0.5 text-[0.65rem] font-bold">{STATUS_LABEL[b.status]}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {b.phone} · {size} хүн
                        {b.source === "staff" ? " · гар" : ""}
                      </p>
                      <p className={`mt-1 text-xs font-semibold ${ready ? "text-emerald-700" : "text-red-600"}`}>
                        Паспорт {b.passengers_ready}/{size}
                        {b.passengers_count === 0 ? " · мэдээлэл ирээгүй" : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-num text-sm font-semibold">{formatPrice(Number(b.total))}</p>
                      <p className="mt-1 text-lg text-muted">›</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
