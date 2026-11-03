import { Icon } from "@/components/Icon";
import { AdminTitle, titleActionClass } from "@/app/admin/(panel)/AdminTitle";
import { Broadcast } from "@/app/admin/(panel)/departures/[tour]/Broadcast";
import { formatPrice, type Tour } from "@/data/tours";
import { requireAdmin } from "@/lib/server/auth";
import { departureBookings } from "@/lib/server/manifest";
import { db } from "@/lib/server/trips";
import { STATUS_LABEL } from "@/lib/trips";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminDeparturePage({ params, searchParams }: PageProps<"/admin/departures/[tour]">) {
  await requireAdmin("departures.manage");
  const { tour: tourId } = await params;
  const { date } = await searchParams;
  const label = typeof date === "string" ? date : "";

  const [{ data: tourRow }, bookings] = await Promise.all([
    db().from("tours").select("data").eq("id", tourId).maybeSingle(),
    departureBookings(tourId, label),
  ]);
  if (!tourRow) notFound();
  const tour = tourRow.data as Tour;
  const live = bookings.filter((b) => b.status !== "cancelled");
  const people = live.reduce((n, b) => n + b.adults + b.kids_own_bed + b.kids_shared_bed, 0);
  const query = `?date=${encodeURIComponent(label)}`;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/departures" className="mb-2 inline-flex text-sm font-semibold text-accent">
        ‹ Огноо, суудал
      </Link>
      <AdminTitle
        title={tour.title}
        sub={`${label || "Огноогүй"} · ${live.length} захиалга · ${people} хүн`}
        action={
          <a href={`/admin/departures/${tourId}/export${query}`} className={titleActionClass}>
            <Icon name="upload" size={15} className="mr-1.5 inline -mt-0.5 rotate-180" />Excel жагсаалт
          </a>
        }
      />
      <p className="mt-2 text-xs text-muted">Паспортын дэлгэрэнгүй мэдээлэл зөвхөн Excel татахад шифрээс тайлагдах бөгөөд хэн, хэзээ татсан нь бүртгэгдэнэ.</p>

      <Broadcast tourId={tourId} label={label} recipients={live.length} />

      <div className="mt-5 space-y-3">
        {bookings.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Захиалга алга.</p> : null}
        {bookings.map((b) => {
          const size = b.adults + b.kids_own_bed + b.kids_shared_bed;
          return (
            <article key={b.id} className={`rounded-2xl border border-[var(--line)] bg-white p-4 ${b.status === "cancelled" ? "opacity-50" : ""}`}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <span className="rounded-full bg-[#f3f6f5] px-2.5 py-0.5 text-[0.7rem] font-bold">{STATUS_LABEL[b.status]}</span>
                <span className="font-mono text-xs text-muted">{b.id}</span>
                <span className="font-semibold">{b.name}</span>
                <a href={`tel:${b.phone.replace(/\s/g, "")}`} className="font-semibold text-accent">
                  {b.phone}
                </a>
                <span className="text-muted">
                  {b.adults + b.kids_own_bed + b.kids_shared_bed} хүн{b.single_rooms ? ` · ${b.single_rooms} ганц өрөө` : ""}
                </span>
                <span className="ml-auto font-num">
                  {formatPrice(Number(b.paid_amount))} / {formatPrice(Number(b.total))}
                </span>
              </div>
              <p className={`mt-2 text-xs font-semibold ${b.passengers_ready >= size ? "text-emerald-700" : "text-red-600"}`}>
                <Icon name="users" size={14} className="mr-1.5 inline -mt-0.5 text-muted" />Паспорт бэлэн: {b.passengers_ready}/{size}
                {b.passengers_count === 0 ? " — мэдээлэл ирээгүй" : ""}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
