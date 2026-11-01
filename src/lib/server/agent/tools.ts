import "server-only";

import { formatPrice, tourDates, type Tour } from "@/data/tours";
import { EDITABLE_TOUR_FIELDS, firstName, maskPhone, salesSummary, tourDiff, type DiffRow, type ProposalKind, type ProposalView, type SalesBooking } from "@/lib/agent";
import { siteStats } from "@/lib/server/analytics";
import { heldSeats } from "@/lib/server/seats";
import { parseNews } from "@/lib/server/content-validate";
import type { NewsItem } from "@/data/news";
import { tripChecklist } from "@/lib/checklist";
import { DOC_TYPES } from "@/lib/documents";
import { can, type Permission } from "@/lib/permissions";
import { audit } from "@/lib/server/audit";
import type { Admin } from "@/lib/server/auth";
import { invalidMessage, parseTour } from "@/lib/server/content-validate";
import { getSeats } from "@/lib/server/seats";
import { tripView } from "@/lib/server/trip-view";
import { BOOKING_COLUMNS, db, type BookingRow } from "@/lib/server/trips";
import { STATUS_LABEL } from "@/lib/trips";
import { tool, type ToolSet } from "ai";
import { z } from "zod";

/**
 * The admin agent's tools. Each one names the permission it needs; the set handed to the
 * model holds only what the signed-in role may use. Reads go through fixed queries (no SQL
 * from the model); writes only create proposals that a person approves in the dashboard.
 */

type Ctx = { admin: Admin; conversationId: string };

const STATUSES = ["new", "contacted", "confirmed", "paid", "cancelled", "waitlist"] as const;
const ISO_DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
/** Free text for ilike filters: no PostgREST syntax characters */
const searchText = (s: string) => s.replace(/[,()%*\\:"']/g, " ").trim().slice(0, 40);

async function loadTours() {
  const { data, error } = await db().from("tours").select("id, data, updated_at").order("position").order("id");
  if (error) throw new Error("Аяллын жагсаалт уншиж чадсангүй.");
  return (data ?? []).map((r) => ({ tour: r.data as Tour, updatedAt: r.updated_at as string }));
}

function tourCard(t: Tour, seats?: Record<string, { left: number; closed: boolean }>) {
  return {
    id: t.id,
    title: t.title,
    destination: t.destination,
    price: t.price,
    price_label: formatPrice(t.price),
    old_price: t.oldPrice ?? null,
    tag: t.tag ?? null,
    status: t.status === "ended" ? "ended" : t.tag === "soon" ? "soon" : "live",
    dates: tourDates(t),
    duration: t.duration,
    seats_left: seats ? Object.fromEntries(Object.entries(seats).map(([d, s]) => [d, s.closed ? "хаалттай" : s.left])) : null,
    documents: t.documents ?? [],
    link: `/tours/${t.id}`,
  };
}

const bookingLine = (b: BookingRow) => ({
  id: b.id,
  created: b.created_at.slice(0, 10),
  tour: b.tour_title,
  tour_id: b.tour_id,
  travel_date: b.travel_date,
  status: STATUS_LABEL[b.status],
  travellers: b.adults + b.kids_own_bed + b.kids_shared_bed,
  total: b.total,
  paid: Number(b.paid_amount),
  remaining: Math.max(0, Number(b.total) - Number(b.paid_amount)),
  first_name: firstName(b.name),
  phone: maskPhone(b.phone),
  passports_ready: `${b.passengers_ready}/${b.adults + b.kids_own_bed + b.kids_shared_bed}`,
  admin_link: `/admin?q=${b.id}`,
});

/** Tour fields as a zod shape for proposals; parseTour() does the full validation afterwards. */
const itineraryDay = z.object({
  day: z.string().max(60),
  title: z.string().max(200),
  detail: z.string().max(4000),
  flight: z.string().max(200).optional(),
  meals: z.string().max(200).optional(),
  hotel: z.string().max(200).optional(),
});
const tourFields = z.object({
  title: z.string().max(200),
  destination: z.string().max(120),
  destinationKey: z.enum(["hainan", "hongkong", "bali", "soon"]),
  description: z.string().max(600),
  story: z.string().max(4000),
  price: z.number().int().min(0).max(500_000_000).nullable(),
  oldPrice: z.number().int().min(0).max(500_000_000).nullable(),
  duration: z.string().max(60),
  nights: z.number().int().min(0).max(60).nullable(),
  tag: z.enum(["hot", "soon", "sale"]).nullable(),
  status: z.enum(["ended"]).nullable(),
  discount: z.string().max(30).nullable(),
  image: z.string().url().max(1000),
  gallery: z.array(z.string().url().max(1000)).max(30),
  dates: z.string().max(400).nullable(),
  stay: z.string().max(200).nullable(),
  departure: z.string().max(200).nullable(),
  highlights: z.array(z.string().max(1000)).max(20),
  includes: z.array(z.string().max(1000)).max(30),
  excludes: z.array(z.string().max(1000)).max(30),
  itinerary: z.array(itineraryDay).max(30),
  pricing: z.object({
    child: z.string().max(400).optional(),
    childSharedBed: z.number().int().min(0).optional(),
    childOwnBed: z.boolean().optional(),
    singleSupplement: z.number().int().min(0).optional(),
    depositPercent: z.number().int().min(0).max(100).optional(),
  }),
  notes: z.array(z.string().max(1000)).max(20),
  documents: z.array(z.enum(DOC_TYPES.map((d) => d.type) as [string, ...string[]])).max(10),
});

/** null in a change means "clear this optional field" */
function applyChanges(current: Tour, changes: Record<string, unknown>) {
  const next: Record<string, unknown> = { ...current };
  for (const [k, v] of Object.entries(changes)) {
    if (!(EDITABLE_TOUR_FIELDS as readonly string[]).includes(k)) continue;
    if (v === null) delete next[k];
    else next[k] = v;
  }
  return next;
}

async function saveProposal(ctx: Ctx, p: { kind: ProposalKind; targetId: string; baseUpdatedAt: string | null; payload: unknown; summary: string; diff: DiffRow[] }) {
  const { data, error } = await db()
    .from("ai_proposals")
    .insert({
      conversation_id: ctx.conversationId,
      admin_email: ctx.admin.email,
      kind: p.kind,
      target_id: p.targetId,
      base_updated_at: p.baseUpdatedAt,
      payload: p.payload,
      summary: p.summary.slice(0, 500),
      diff: p.diff,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("Саналыг хадгалж чадсангүй.");
  await audit(ctx.admin.email, `agent.${p.kind}.propose`, { type: p.kind.split(".")[0], id: p.targetId }, { proposal: data.id, fields: p.diff.map((d) => d.field) });
  const view: ProposalView = { proposalId: data.id as string, kind: p.kind, targetId: p.targetId, summary: p.summary, diff: p.diff, status: "pending" };
  return view;
}

type Def = { permission: Permission | Permission[]; tool: ToolSet[string] };

function definitions(ctx: Ctx): Record<string, Def> {
  return {
    listTours: {
      permission: ["bookings.view", "content.manage"],
      tool: tool({
        description: "Бүх аяллын жагсаалт: id, нэр, үнэ, огноо, үлдсэн суудал, төлөв. status: live (захиалга авч буй), ended, all.",
        inputSchema: z.object({ status: z.enum(["live", "ended", "all"]).default("all") }),
        execute: async ({ status }) => {
          const [rows, seats] = await Promise.all([loadTours(), getSeats()]);
          const tours = rows.map((r) => r.tour).filter((t) => status === "all" || (status === "ended" ? t.status === "ended" : t.status !== "ended"));
          return { count: tours.length, tours: tours.map((t) => tourCard(t, seats[t.id])) };
        },
      }),
    },
    searchTours: {
      permission: ["bookings.view", "content.manage"],
      tool: tool({
        description: "Аяллыг нэр, чиглэл, id, огноогоор хайх (жишээ: бали, хайнань, weeknd).",
        inputSchema: z.object({ query: z.string().min(1).max(80) }),
        execute: async ({ query }) => {
          const q = query.toLowerCase();
          const [rows, seats] = await Promise.all([loadTours(), getSeats()]);
          const hits = rows
            .map((r) => r.tour)
            .filter((t) => `${t.id} ${t.title} ${t.destination} ${t.destinationKey} ${t.dates ?? ""}`.toLowerCase().includes(q));
          return { count: hits.length, tours: hits.map((t) => tourCard(t, seats[t.id])) };
        },
      }),
    },
    getTour: {
      permission: ["bookings.view", "content.manage"],
      tool: tool({
        description: "Нэг аяллын бүрэн мэдээлэл (засварлах бүх талбар, хөтөлбөр, үнийн нөхцөл) болон сүүлд хэзээ засагдсан.",
        inputSchema: z.object({ id: z.string().regex(/^[a-z0-9-]{2,60}$/) }),
        execute: async ({ id }) => {
          const { data } = await db().from("tours").select("data, updated_at, updated_by").eq("id", id).maybeSingle();
          if (!data) return { error: "Ийм id-тай аялал алга." };
          return { tour: data.data as Tour, updated_at: data.updated_at, updated_by: data.updated_by };
        },
      }),
    },
    searchBookings: {
      permission: "bookings.view",
      tool: tool({
        description:
          "Захиалга хайх. query нь захиалгын код (ET-…), аяллын нэр эсвэл аялагчийн нэрээр. Огноо нь захиалга үүссэн өдөр. Хувийн мэдээллийг нууцалсан: зөвхөн эхний нэр, утасны сүүлийн 4 орон.",
        inputSchema: z.object({
          query: z.string().max(60).optional(),
          status: z.enum(STATUSES).optional(),
          tourId: z.string().regex(/^[a-z0-9-]{2,60}$/).optional(),
          from: ISO_DAY.optional(),
          to: ISO_DAY.optional().describe("энэ өдрийг оруулахгүй"),
          limit: z.number().int().min(1).max(50).default(20),
        }),
        execute: async ({ query, status, tourId, from, to, limit }) => {
          let q = db().from("booking_requests").select(BOOKING_COLUMNS).order("created_at", { ascending: false }).limit(limit);
          if (status) q = q.eq("status", status);
          if (tourId) q = q.eq("tour_id", tourId);
          if (from) q = q.gte("created_at", from);
          if (to) q = q.lt("created_at", to);
          const text = query ? searchText(query) : "";
          if (text) q = q.or(`id.ilike.%${text}%,tour_title.ilike.%${text}%,name.ilike.%${text}%`);
          const { data, error } = await q;
          if (error) return { error: "Захиалга уншиж чадсангүй." };
          const rows = (data ?? []) as unknown as BookingRow[];
          return { count: rows.length, bookings: rows.map(bookingLine) };
        },
      }),
    },
    getBooking: {
      permission: "bookings.view",
      tool: tool({
        description: "Нэг захиалгын дэлгэрэнгүй: төлөв, төлбөр, аялагчийн дутуу зүйлс (паспорт, баримт, нэмэлт мэдээлэл, гэрээ), сүүлийн мессежийн огноо. Паспортын мэдээлэл агуулахгүй.",
        inputSchema: z.object({ id: z.string().regex(/^ET-[A-Z0-9]{4,20}$/) }),
        execute: async ({ id }) => {
          const client = db();
          const { data } = await client.from("booking_requests").select(BOOKING_COLUMNS).eq("id", id).maybeSingle();
          if (!data) return { error: "Ийм кодтой захиалга алга." };
          const b = data as unknown as BookingRow;
          const [trip, { data: last }] = await Promise.all([
            tripView(b),
            client.from("booking_messages").select("sender, created_at").eq("booking_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          ]);
          return {
            ...bookingLine(b),
            single_rooms: b.single_rooms,
            deposit: Number(b.deposit),
            staff_note: b.staff_note,
            checklist: tripChecklist(trip).map((i) => ({ section: i.section, done: i.done, task: i.label, details: i.details })),
            last_message: last ? { from: last.sender, at: last.created_at } : null,
            unanswered: last?.sender === "traveller",
          };
        },
      }),
    },
    analyzeSales: {
      permission: "reports.view",
      tool: tool({
        description:
          "Борлуулалтын шинжилгээ тухайн хугацаанд: хүсэлт, баталгаажсан захиалга, хөрвөлт %, борлуулалтын дүн, орж ирсэн төлбөр, авлага. groupBy: month, tour, method (төлбөрийн арга), status. Дүн ₮-өөр.",
        inputSchema: z.object({
          from: ISO_DAY.optional(),
          to: ISO_DAY.optional().describe("энэ өдрийг оруулахгүй"),
          groupBy: z.enum(["month", "tour", "method", "status"]).default("month"),
        }),
        execute: async ({ from, to, groupBy }) => {
          const client = db();
          const [{ data: rows }, { data: pays }] = await Promise.all([
            client.from("booking_requests").select("created_at, tour_id, tour_title, status, total, paid_amount, adults, kids_own_bed, kids_shared_bed").limit(20000),
            client.from("payments").select("amount, paid_at, method").eq("status", "paid").limit(20000),
          ]);
          const bookings = ((rows ?? []) as SalesBooking[]).map((r) => ({ ...r, total: Number(r.total), paid_amount: Number(r.paid_amount) }));
          const payments = (pays ?? []).map((p) => ({ amount: Number(p.amount), paid_at: p.paid_at as string | null, method: p.method as string }));
          return salesSummary(bookings, payments, { from, to, groupBy });
        },
      }),
    },
    analyzeTraffic: {
      permission: "reports.view",
      tool: tool({
        description:
          "Сайтын хандалт сүүлийн N хоногт: зочин, айлчлал, хуудас үзэлт, захиалгын зам (аялал үзсэн → маягт нээсэн → илгээсэн → төлбөр эхлүүлсэн), хаанаас ирсэн (Instagram, Facebook, Google…), аялал тус бүрийн сонирхол, төхөөрөмж. Нэргүй статистик.",
        inputSchema: z.object({ days: z.number().int().min(1).max(365).default(30) }),
        execute: async ({ days }) => {
          const to = new Date();
          const from = new Date(to.getTime() - days * 86400_000);
          const [stats, { count: requests }, rows] = await Promise.all([
            siteStats(from, to),
            db().from("booking_requests").select("id", { count: "exact", head: true }).gte("created_at", from.toISOString()),
            loadTours(),
          ]);
          const titles = Object.fromEntries(rows.map((r) => [r.tour.id, r.tour.title]));
          return {
            period_days: days,
            ...stats,
            daily: stats.daily.slice(-31),
            tours: stats.tours.map((t) => ({ ...t, title: titles[t.tour_id] ?? t.tour_id })),
            booking_requests_created: requests ?? 0,
            note: "Зочин = төхөөрөмж (нэг хүн хоёр утаснаас орвол 2). Тоолол аялагчийн хувийн мэдээлэл агуулахгүй.",
          };
        },
      }),
    },
    listDepartures: {
      permission: ["departures.manage", "bookings.view"],
      tool: tool({
        description: "Аяллын огноо бүрийн суудал: нийт суудал (capacity), эзэлсэн, үлдсэн, хаалттай эсэх, хүлээлэгт хэдэн хүн. tourId өгвөл зөвхөн тэр аялал.",
        inputSchema: z.object({ tourId: z.string().regex(/^[a-z0-9-]{2,60}$/).optional() }),
        execute: async ({ tourId }) => {
          const tours = (await loadTours()).map((r) => r.tour).filter((t) => t.status !== "ended" && (!tourId || t.id === tourId));
          if (!tours.length) return { error: tourId ? "Ийм идэвхтэй аялал алга." : "Идэвхтэй аялал алга." };
          const ids = tours.map((t) => t.id);
          const [held, { data: deps }, { data: waiting }] = await Promise.all([
            heldSeats(ids),
            db().from("departures").select("tour_id, date_label, capacity, closed").in("tour_id", ids),
            db().from("booking_requests").select("tour_id, travel_date, adults, kids_own_bed, kids_shared_bed").eq("status", "waitlist").in("tour_id", ids),
          ]);
          return {
            departures: tours.flatMap((t) =>
              (tourDates(t).length ? tourDates(t) : [""]).map((label) => {
                const dep = (deps ?? []).find((d) => d.tour_id === t.id && d.date_label === label);
                const taken = held.get(`${t.id}|${label}`) ?? 0;
                const capacity = (dep?.capacity as number | null | undefined) ?? null;
                return {
                  tour_id: t.id,
                  tour: t.title,
                  date: label || "(огноогүй)",
                  capacity,
                  booked_people: taken,
                  seats_left: capacity == null ? "хязгааргүй" : Math.max(0, capacity - taken),
                  closed: dep?.closed ?? false,
                  waitlist_people: (waiting ?? [])
                    .filter((w) => w.tour_id === t.id && (w.travel_date ?? "") === label)
                    .reduce((n, w) => n + w.adults + w.kids_own_bed + w.kids_shared_bed, 0),
                };
              }),
            ),
          };
        },
      }),
    },
    proposeDepartureUpdate: {
      permission: "departures.manage",
      tool: tool({
        description:
          "Нэг огнооны суудлын тоо эсвэл захиалга хаах/нээхийг өөрчлөх САНАЛ (ажилтан зөвшөөрнө). capacity null = хязгааргүй. Суудал нэмэхэд хүлээлгийн жагсаалтаас автоматаар шилжинэ. Эхлээд listDepartures-оор одоогийн утгыг шалга.",
        inputSchema: z.object({
          tourId: z.string().regex(/^[a-z0-9-]{2,60}$/),
          date: z.string().max(100).describe("listDepartures-ийн date утга яг адилаар; огноогүй аялалд хоосон"),
          capacity: z.number().int().min(0).max(999).nullable(),
          closed: z.boolean(),
          summary: z.string().min(5).max(300),
        }),
        execute: async ({ tourId, date, capacity, closed, summary }) => {
          const tour = (await loadTours()).find((r) => r.tour.id === tourId)?.tour;
          if (!tour) return { error: "Ийм аялал алга." };
          const label = date === "(огноогүй)" ? "" : date.trim();
          const labels = tourDates(tour);
          if (labels.length ? !labels.includes(label) : label !== "") return { error: `Энэ аялалд «${date}» огноо алга. Боломжтой: ${labels.join(", ") || "(огноогүй)"}` };
          const { data: dep } = await db().from("departures").select("capacity, closed").eq("tour_id", tourId).eq("date_label", label).maybeSingle();
          const base = { capacity: (dep?.capacity as number | null | undefined) ?? null, closed: (dep?.closed as boolean | undefined) ?? false };
          const diff: DiffRow[] = [
            ...(base.capacity !== capacity ? [{ field: "capacity", before: base.capacity, after: capacity }] : []),
            ...(base.closed !== closed ? [{ field: "closed", before: base.closed, after: closed }] : []),
          ];
          if (!diff.length) return { error: "Өөрчлөлт алга — одоогийн утгатай ижил байна." };
          return saveProposal(ctx, {
            kind: "departure.update",
            targetId: `${tourId}|${label}`,
            baseUpdatedAt: null,
            payload: { tourId, label, capacity, closed, base },
            summary: `${tour.title}${label ? ` (${label})` : ""}: ${summary}`,
            diff,
          });
        },
      }),
    },
    proposeMessage: {
      permission: "bookings.manage",
      tool: tool({
        description:
          "Нэг аялагчийн захиалгын чат руу Elite Travel-ийн нэрээр мессеж илгээх САНАЛ (ажилтан уншаад зөвшөөрнө, дараа нь аппад push мэдэгдэл очно). Эелдэг, монгол кирилл, баримтыг getBooking-оор шалгасны дараа.",
        inputSchema: z.object({
          bookingId: z.string().regex(/^ET-[A-Z0-9]{4,20}$/),
          text: z.string().min(2).max(1000),
          summary: z.string().min(5).max(300),
        }),
        execute: async ({ bookingId, text, summary }) => {
          const { data: b } = await db().from("booking_requests").select("id, name, status").eq("id", bookingId).maybeSingle();
          if (!b) return { error: "Ийм кодтой захиалга алга." };
          if (b.status === "cancelled") return { error: "Цуцлагдсан захиалга руу мессеж илгээхгүй." };
          return saveProposal(ctx, {
            kind: "message.send",
            targetId: bookingId,
            baseUpdatedAt: null,
            payload: { bookingId, text: text.trim() },
            summary: `${bookingId} (${firstName(b.name as string)}): ${summary}`,
            diff: [{ field: "message", before: null, after: text.trim() }],
          });
        },
      }),
    },
    proposeNews: {
      permission: "content.manage",
      tool: tool({
        description:
          "Сайтын «Мэдээ» хэсэгт шинэ нийтлэл нэмэх САНАЛ (ажилтан зөвшөөрнө). body нь догол мөрүүдийн жагсаалт. Зураг өгөөгүй бол tourId-ийн аяллын нүүр зургийг ашиглана. Үнэ, огноог зөвхөн хэрэгслээс авсан баримтаар бич.",
        inputSchema: z.object({
          id: z.string().regex(/^[a-z0-9-]{2,60}$/).describe("латин жижиг үсэг, зураас"),
          category: z.enum(["Мэдээ", "Урамшуулал", "Зөвлөгөө"]),
          title: z.string().min(3).max(200),
          excerpt: z.string().min(10).max(400),
          body: z.array(z.string().min(1).max(2000)).min(1).max(12),
          image: z.string().url().max(1000).optional(),
          tourId: z.string().regex(/^[a-z0-9-]{2,60}$/).optional(),
          summary: z.string().min(5).max(300),
        }),
        execute: async ({ summary, ...input }) => {
          const { data: taken } = await db().from("news").select("id").eq("id", input.id).maybeSingle();
          if (taken) return { error: `«${input.id}» id-тай мэдээ аль хэдийн байна. Өөр id сонго.` };
          const tour = input.tourId ? (await loadTours()).find((r) => r.tour.id === input.tourId)?.tour : undefined;
          if (input.tourId && !tour) return { error: "tourId-д заасан аялал алга." };
          let item: NewsItem;
          try {
            item = parseNews({ ...input, image: input.image ?? tour?.image, readMin: undefined });
          } catch (e) {
            return { error: invalidMessage(e) ?? "Мэдээний мэдээлэл буруу байна." };
          }
          const diff = (["id", "category", "title", "excerpt", "body", "image", "tourId", "readMin"] as const)
            .filter((k) => item[k] != null)
            .map((k) => ({ field: k, before: null, after: item[k] }));
          return saveProposal(ctx, { kind: "news.create", targetId: item.id, baseUpdatedAt: null, payload: item, summary, diff });
        },
      }),
    },
    tourWritingContext: {
      permission: "content.manage",
      tool: tool({
        description:
          "Аяллын тайлбар, дэлгэрэнгүй, онцлох зүйлс бичихээс өмнө дууд: тухайн аяллын баримт мэдээлэл болон сайтын бусад аяллын бичлэгийн хэв маягийн жишээ. Дараа нь өөрөө бичээд, хадгалах бол proposeTourUpdate ашигла.",
        inputSchema: z.object({ id: z.string().regex(/^[a-z0-9-]{2,60}$/).optional() }),
        execute: async ({ id }) => {
          const rows = await loadTours();
          const target = id ? rows.find((r) => r.tour.id === id)?.tour : undefined;
          const examples = rows
            .map((r) => r.tour)
            .filter((t) => t.id !== id && t.status !== "ended")
            .slice(0, 3)
            .map((t) => ({ title: t.title, description: t.description, highlights: t.highlights.slice(0, 4) }));
          return {
            tour: target ?? null,
            style_examples: examples,
            rules: [
              "Монгол кирилл, найрсаг, тансаг аялалд тохирсон хэв маяг.",
              "description ≤ 600 тэмдэгт, 1–2 өгүүлбэр. highlights нь богино хэллэг.",
              "Үнэ, огноо, буудал, нислэг, багтсан зүйлсийг зохиохгүй — зөвхөн өгөгдсөн баримтыг ашигла.",
            ],
          };
        },
      }),
    },
    proposeTourUpdate: {
      permission: "content.manage",
      tool: tool({
        description:
          "Одоо байгаа аяллыг засах САНАЛ бэлдэх. Шууд хадгалахгүй: админ дэлгэцэн дээр өөрчлөлтийг хараад «Зөвшөөрөх» дарсны дараа хадгалагдана. changes-д зөвхөн өөрчлөх талбаруудыг бүтэн утгаар нь өг (жагсаалтыг бүхэлд нь). Талбарыг арилгах бол null.",
        inputSchema: z.object({
          id: z.string().regex(/^[a-z0-9-]{2,60}$/),
          changes: tourFields.partial(),
          summary: z.string().min(5).max(300).describe("Юу, яагаад өөрчлөгдөж буйг 1 өгүүлбэрээр"),
        }),
        execute: async ({ id, changes, summary }) => {
          const { data } = await db().from("tours").select("data, updated_at").eq("id", id).maybeSingle();
          if (!data) return { error: "Ийм id-тай аялал алга." };
          const current = data.data as Tour;
          let next: Tour;
          try {
            next = parseTour(applyChanges(current, changes));
          } catch (e) {
            return { error: invalidMessage(e) ?? "Өөрчлөлт буруу байна." };
          }
          const diff = tourDiff(current, next);
          if (!diff.length) return { error: "Өөрчлөлт алга — одоогийн утгатай ижил байна." };
          return saveProposal(ctx, { kind: "tour.update", targetId: id, baseUpdatedAt: data.updated_at as string, payload: next, summary, diff });
        },
      }),
    },
    proposeTourCreate: {
      permission: "content.manage",
      tool: tool({
        description:
          "Шинэ аялал нэмэх САНАЛ бэлдэх (шууд нийтлэхгүй, админ зөвшөөрнө). Бүх шаардлагатай талбарыг бөглө. Үнэ, огноо, нислэг зэргийг хэрэглэгчээс авсан мэдээллээр л бөглө; мэдэхгүй бол асуу.",
        inputSchema: z.object({
          tour: tourFields.extend({ id: z.string().regex(/^[a-z0-9-]{2,60}$/).describe("латин жижиг үсэг, зураас: ж нь japan-tokyo") }).partial({
            oldPrice: true,
            nights: true,
            tag: true,
            status: true,
            discount: true,
            dates: true,
            stay: true,
            departure: true,
            gallery: true,
            notes: true,
            documents: true,
            pricing: true,
          }),
          summary: z.string().min(5).max(300),
        }),
        execute: async ({ tour, summary }) => {
          const { data: taken } = await db().from("tours").select("id").eq("id", tour.id).maybeSingle();
          if (taken) return { error: `«${tour.id}» id аль хэдийн байна. Өөр id сонго эсвэл proposeTourUpdate ашигла.` };
          let next: Tour;
          try {
            next = parseTour(applyChanges({ id: tour.id, gallery: [], notes: [] } as unknown as Tour, tour));
          } catch (e) {
            return { error: invalidMessage(e) ?? "Аяллын мэдээлэл буруу байна." };
          }
          return saveProposal(ctx, { kind: "tour.create", targetId: next.id, baseUpdatedAt: null, payload: next, summary, diff: tourDiff(null, next) });
        },
      }),
    },
  };
}

/**
 * The tools this admin may use, each wrapped so every call lands in the audit log
 * (tool name and arguments; results stay out of the log).
 */
export function agentTools(ctx: Ctx): ToolSet {
  const out: ToolSet = {};
  for (const [name, def] of Object.entries(definitions(ctx))) {
    const needs = Array.isArray(def.permission) ? def.permission : [def.permission];
    if (!needs.some((p) => can(ctx.admin.role, p))) continue;
    const original = def.tool;
    out[name] = {
      ...original,
      execute: async (input: unknown, options: Parameters<NonNullable<typeof original.execute>>[1]) => {
        await audit(ctx.admin.email, "agent.tool", { type: "agent", id: ctx.conversationId }, { tool: name, input: JSON.stringify(input).slice(0, 500) });
        try {
          return await original.execute!(input as never, options);
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Алдаа гарлаа." };
        }
      },
    } as ToolSet[string];
  }
  return out;
}
