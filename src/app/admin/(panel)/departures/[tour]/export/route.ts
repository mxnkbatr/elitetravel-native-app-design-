import { requireAdmin } from "@/lib/server/auth";
import { departureBookings, manifestCsv, manifestPassengers } from "@/lib/server/manifest";

export const runtime = "nodejs";

export async function GET(request: Request, ctx: RouteContext<"/admin/departures/[tour]/export">) {
  const admin = await requireAdmin("passports.view");
  const { tour } = await ctx.params;
  const label = new URL(request.url).searchParams.get("date") ?? "";
  const bookings = await departureBookings(tour, label);
  const csv = manifestCsv(bookings, await manifestPassengers(bookings, admin.email));
  const name = `${tour}_${label || "no-date"}`.replace(/[^\w-]+/g, "_");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="manifest_${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
