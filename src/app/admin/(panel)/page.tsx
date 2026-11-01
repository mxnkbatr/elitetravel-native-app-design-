import { adminPulse } from "@/app/admin/(panel)/actions";
import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import { BookingsBoard, type AdminBooking } from "@/app/admin/(panel)/BookingsBoard";
import { can } from "@/lib/permissions";
import { requireAdmin } from "@/lib/server/auth";
import { pendingInstallments, toRequest } from "@/lib/server/installments";
import { BOOKING_COLUMNS, db } from "@/lib/server/trips";

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin("bookings.view");
  const { q } = await searchParams;
  const money = can(admin.role, "money.manage");
  const [{ data, error }, pulse, installments] = await Promise.all([
    db().from("booking_requests").select(BOOKING_COLUMNS).order("created_at", { ascending: false }).limit(500),
    adminPulse(),
    money ? pendingInstallments() : Promise.resolve([]),
  ]);

  return (
    <>
      <AdminTitle title="Захиалга" sub="Сайт болон аппаас ирсэн хүсэлтүүд. Төлөв солиход аялагчид аппаар нь автоматаар мэдэгдэнэ." />
      {error ? (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">Захиалга ачаалж чадсангүй.</p>
      ) : (
        <BookingsBoard
          key={`${data?.[0]?.id ?? "empty"}-${typeof q === "string" ? q : ""}`}
          initialQuery={typeof q === "string" ? q.slice(0, 40) : ""}
          bookings={(data ?? []) as unknown as AdminBooking[]}
          unread={pulse.unread}
          stale={pulse.stale}
          installments={Object.fromEntries(installments.map((r) => [r.booking_id, toRequest(r)]))}
          perms={{ manage: can(admin.role, "bookings.manage"), money, passports: can(admin.role, "passports.view") }}
        />
      )}
    </>
  );
}
