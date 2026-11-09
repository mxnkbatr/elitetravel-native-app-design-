import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import { BookingsBoard, type AdminBooking } from "@/app/admin/(panel)/BookingsBoard";
import { ManualBookingForm } from "@/app/admin/(panel)/ManualBookingForm";
import { TodayStrip } from "@/app/admin/(panel)/TodayStrip";
import type { Tour } from "@/data/tours";
import { can } from "@/lib/permissions";
import { requireAdmin } from "@/lib/server/auth";
import { pendingInstallments, toRequest } from "@/lib/server/installments";
import { pulseFor } from "@/lib/server/pulse";
import { BOOKING_COLUMNS, db } from "@/lib/server/trips";

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin("bookings.view");
  const { q, f, tab } = await searchParams;
  const money = can(admin.role, "money.manage");
  const [{ data, error }, pulse, installments, { data: tourRows }] = await Promise.all([
    db().from("booking_requests").select(BOOKING_COLUMNS).order("created_at", { ascending: false }).limit(500),
    pulseFor(admin),
    money ? pendingInstallments() : Promise.resolve([]),
    db().from("tours").select("data").order("position").order("id"),
  ]);
  const tours = (tourRows ?? [])
    .map((r) => r.data as Tour)
    .filter((t) => t.status !== "ended")
    .map((t) => ({ id: t.id, title: t.title, price: t.price, dates: t.dates, pricing: t.pricing }));

  return (
    <>
      <AdminTitle
        title="Захиалга"
        sub="Сайт, апп, гар бүртгэл. Хүн дээр дарж мэдээлэл, чат, төлбөрөө харна."
        action={<ManualBookingForm tours={tours} canManage={can(admin.role, "bookings.manage")} />}
      />
      <TodayStrip />
      {error ? (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">Захиалга ачаалж чадсангүй.</p>
      ) : (
        <BookingsBoard
          key={`${data?.[0]?.id ?? "empty"}-${typeof q === "string" ? q : ""}-${typeof f === "string" ? f : ""}-${typeof tab === "string" ? tab : ""}`}
          initialQuery={typeof q === "string" ? q.slice(0, 40) : ""}
          initialFilter={typeof f === "string" ? f : undefined}
          initialTab={typeof tab === "string" ? tab : undefined}
          bookings={(data ?? []) as unknown as AdminBooking[]}
          unread={pulse.unread}
          stale={pulse.stale}
          docs={pulse.documents}
          installments={Object.fromEntries(installments.map((r) => [r.booking_id, toRequest(r)]))}
          perms={{ manage: can(admin.role, "bookings.manage"), money, passports: can(admin.role, "passports.view") }}
        />
      )}
    </>
  );
}
