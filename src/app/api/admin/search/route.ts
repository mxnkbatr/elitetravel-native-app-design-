import { can } from "@/lib/permissions";
import { getAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/trips";
import { STATUS_LABEL, type TripStatus } from "@/lib/trips";

export const runtime = "nodejs";

export type SearchHit = { kind: "booking" | "tour" | "news"; id: string; title: string; sub: string; href: string };

/** Command palette search: bookings by code, name or phone; tours and news by title. */
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  const q = (new URL(request.url).searchParams.get("q") ?? "").replace(/[,()%*\\:"']/g, " ").trim().slice(0, 40);
  if (q.length < 2) return Response.json({ hits: [] });

  const client = db();
  const like = `%${q}%`;
  const content = can(admin.role, "content.manage");
  const [bookings, tours, news] = await Promise.all([
    can(admin.role, "bookings.view")
      ? client
          .from("booking_requests")
          .select("id, name, tour_title, status, travel_date")
          .or(`id.ilike.${like},name.ilike.${like},phone.ilike.${like},tour_title.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
    content || can(admin.role, "bookings.view") ? client.from("tours").select("id, data->>title, data->>destination").or(`id.ilike.${like},data->>title.ilike.${like}`).limit(5) : Promise.resolve({ data: [] }),
    content ? client.from("news").select("id, data->>title").or(`id.ilike.${like},data->>title.ilike.${like}`).limit(3) : Promise.resolve({ data: [] }),
  ]);

  const hits: SearchHit[] = [
    ...(bookings.data ?? []).map((b) => ({
      kind: "booking" as const,
      id: b.id as string,
      title: `${b.id} · ${b.name}`,
      sub: [b.tour_title, b.travel_date, STATUS_LABEL[b.status as TripStatus]].filter(Boolean).join(" · "),
      href: `/admin?q=${b.id}`,
    })),
    ...((tours.data ?? []) as { id: string; title: string; destination: string }[]).map((t) => ({
      kind: "tour" as const,
      id: t.id,
      title: t.title,
      sub: `Аялал · ${t.destination}`,
      href: content ? `/admin/tours/${t.id}` : `/tours/${t.id}`,
    })),
    ...((news.data ?? []) as { id: string; title: string }[]).map((n) => ({ kind: "news" as const, id: n.id, title: n.title, sub: "Мэдээ", href: `/admin/news/${n.id}` })),
  ];
  return Response.json({ hits });
}
