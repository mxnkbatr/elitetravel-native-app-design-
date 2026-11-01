import "server-only";

import { formatPrice, tourDates, type Tour } from "@/data/tours";
import { EDITABLE_TOUR_FIELDS, firstName, maskPhone, salesSummary, tourDiff, type ProposalView, type SalesBooking } from "@/lib/agent";
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

async function saveProposal(ctx: Ctx, p: { kind: "tour.create" | "tour.update"; targetId: string; baseUpdatedAt: string | null; payload: Tour; summary: string; diff: ReturnType<typeof tourDiff> }) {
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
  await audit(ctx.admin.email, `agent.${p.kind}.propose`, { type: "tours", id: p.targetId }, { proposal: data.id, fields: p.diff.map((d) => d.field) });
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
