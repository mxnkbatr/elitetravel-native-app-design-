import { formatPrice, getTour, isBookable, type Tour } from "@/data/tours";
import { quote } from "@/lib/pricing";
import { tripChecklist } from "@/lib/checklist";
import { chatProviderOptions, siteModel, SITE_GUIDE } from "@/lib/server/ai";
import { getAssistantSettings } from "@/lib/server/assistant-settings";
import { clientIp, originAllowed, rateLimit } from "@/lib/server/chat-security";
import { getTours } from "@/lib/server/content";
import { reportError } from "@/lib/server/error-log";
import { bookingFacts } from "@/lib/server/trip-assistant";
import { tripView } from "@/lib/server/trip-view";
import { BOOKING_COLUMNS, db, type BookingRow } from "@/lib/server/trips";
import { getSeats } from "@/lib/server/seats";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { INSTALLMENT_PROVIDERS } from "@/lib/trips";
import { convertToModelMessages, isStepCount, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

export const maxDuration = 60;

/** Keeps a single visitor from running up the model bill with huge or endless chats. */
const MAX_TURNS = 12;
const MAX_CHARS = 2000;
const PHONE = "+976 9003 1771";
const PARTNERS = INSTALLMENT_PROVIDERS.map((p) => p.name).join(", ");

const textOf = (m: UIMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

const ALIASES: Record<string, string[]> = {
  bali: ["бали", "индонез", "bali"],
  hainan: ["хайнань", "хайнан", "саня", "hainan", "sanya"],
  hongkong: ["weeknd", "викенд", "хонг конг", "hong kong", "хонконг"],
  dately: ["dately", "дэйтли", "дейтли"],
};
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

function findTours(tours: Tour[], query?: string) {
  if (!query?.trim()) return tours;
  const q = norm(query);
  return tours.filter((t) => {
    const hay = norm(`${t.id} ${t.title} ${t.destination} ${t.destinationKey} ${t.dates ?? ""}`);
    if (q.split(" ").some((w) => w.length > 2 && hay.includes(w))) return true;
    return Object.entries(ALIASES).some(([key, al]) => al.some((a) => q.includes(a)) && (hay.includes(key) || al.some((a) => hay.includes(a))));
  });
}

function systemPrompt(tours: Tour[], hasBookings: boolean, teamNotes: string) {
  const open = tours.filter(isBookable);
  const soon = tours.filter((t) => t.tag === "soon" && t.status !== "ended").map((t) => t.title);
  return `Та бол Elite Travel Mongolia (elitetravel.mn) аялал жуулчлалын компанийн найрсаг, эелдэг туслах "Элит туслах".

${SITE_GUIDE}

${
  hasBookings
    ? `ЭНЭ ХЭРЭГЛЭГЧ ЗАХИАЛГАТАЙ: захиалга, төлбөр, юу дутуу, юу бөглөх, баримт, гэрээ, паспортын талаар асуувал ЗААВАЛ myBookings дуудаж шалга. checklist-ийн done=false зүйлсийг аль хэсэгт («...» хэсэг) хийхийг тодорхой жагсааж, захиалгын хуудасны холбоосыг яг "/bookings/<код>" хэлбэрээр бич.`
    : "Хэрэглэгч энэ төхөөрөмжөөс захиалга хийгээгүй. Захиалгын талаар асуувал захиалга хийсэн утсаараа «Миний захиалга» хэсгийг нээх эсвэл манай утсаар холбогдохыг зөвлө."
}

ДҮРЭМ:
1. Зөвхөн getTours, estimatePayment, myBookings хэрэгслээс ирсэн мэдээлэл болон дээрх тайлбарт тулгуурлан хариул. Үнэ, огноо, хөтөлбөр, багтсан зүйлсийг асуувал ЗААВАЛ getTours дуудаж шалга.
2. Үнэ, огноо, суудал, хөнгөлөлт, визийн нөхцөл, зээлийн хүү зэргийг ХЭЗЭЭ Ч зохиож болохгүй. Мэдээлэл байхгүй бол "Энэ мэдээллийг манай баг тодруулж өгнө" гээд холбогдох суваг санал болго.
3. Урьдчилгаа/нийт дүнг тооцохдоо estimatePayment ашигла. Дүн бүрийн дараа "Энэ нь урьдчилсан тооцоо, эцсийн дүнг манай баг баталгаажуулна" гэж заавал хэл.
4. Хуваан төлөх: ${PARTNERS}-ээр боломжтой (захиалгын «Төлбөр» хэсгээс). Хугацаа, хүүг мэдэхгүй — багаас лавлуул.
5. Захиалах бол аяллын хуудсан дээрх "Захиалах" товчийг санал болго. Эргэлзэж байвал, гомдол, визийн дэлгэрэнгүй асуувал: утас ${PHONE}, Instagram @elitetravelmn.
6. Монгол хэлээр (кирилл) товч, ойлгомжтой, найрсаг хариул. Хэрэглэгч англиар бичвэл англиар хариулж болно. Хариултаа 120 үгнээс хэтрүүлэхгүй, жагсаалт ашиглаж болно.
7. Аялал санал болгохдоо холбоосыг нь яг "/tours/<id>" хэлбэрээр бич (жишээ: /tours/bali). Markdown (**, #, [](…)) БҮҮ ашигла — энгийн текст, жагсаалтыг "• " тэмдэгээр бич.
8. Аялал жуулчлал, Elite Travel-ээс өөр сэдвээр (код, улс төр г.м) хариулахгүй — эелдгээр буцаа.
${soon.length ? `9. Удахгүй: ${soon.join(", ")} — дэлгэрэнгүй мэдээлэл хараахан гараагүй, захиалга нээгдээгүй.` : ""}

Одоо захиалга авч буй аяллууд (id: нэр):
${open.map((t) => `- ${t.id}: ${t.title}`).join("\n")}${
    teamNotes
      ? `

ELITE TRAVEL БАГИЙН НЭМЭЛТ ЗААВАР (admin-аас; дээрх дүрмүүдтэй зөрчилдвөл дүрэм давуу):
${teamNotes}`
      : ""
  }`;
}

export async function POST(req: Request) {
  if (!originAllowed(req)) return Response.json({ error: "origin_not_allowed" }, { status: 403 });
  if (!rateLimit(clientIp(req))) return Response.json({ error: "rate_limited", message: "Түр хүлээгээд дахин оролдоно уу." }, { status: 429 });

  const model = siteModel();
  if (!model) return Response.json({ error: "unavailable" }, { status: 503 });

  let messages: UIMessage[];
  let tripTokens: string[];
  try {
    const body = (await req.json()) as { messages: UIMessage[]; tripTokens?: unknown };
    messages = body.messages;
    tripTokens = Array.isArray(body.tripTokens) ? body.tripTokens.filter((t): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(t)).slice(0, 10) : [];
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) return Response.json({ error: "bad request" }, { status: 400 });
  const recent = messages.slice(-MAX_TURNS);
  if (recent.some((m) => textOf(m).length > MAX_CHARS)) return Response.json({ error: "too long" }, { status: 413 });

  const [allTours, seats, assistant] = await Promise.all([getTours(), getSeats(), getAssistantSettings()]);
  if (!assistant.enabled) return Response.json({ error: "unavailable" }, { status: 503 });
  // Test tours are reachable by link only; the assistant never offers them
  const tours = allTours.filter((t) => !t.unlisted);
  const live = tours.filter((t) => t.status !== "ended");

  const result = streamText({
    model,
    providerOptions: chatProviderOptions,
    system: systemPrompt(live, tripTokens.length > 0, assistant.instructions),
    messages: await convertToModelMessages(recent),
    maxOutputTokens: 900,
    stopWhen: isStepCount(4),
    tools: {
      myBookings: tool({
        description: "Энэ хэрэглэгчийн өөрийн захиалгууд: төлөв, төлсөн/үлдэгдэл, аялалд бэлтгэхэд юу дутуу байгаа (checklist). Захиалгатай холбоотой асуултад заавал дууд.",
        inputSchema: z.object({}),
        execute: async () => {
          if (!tripTokens.length) return { bookings: [], note: "Энэ төхөөрөмжөөс хийсэн захиалга алга." };
          const { data } = await db().from("booking_requests").select(BOOKING_COLUMNS).in("access_token", tripTokens);
          const bookings = await Promise.all(
            ((data ?? []) as BookingRow[]).map(async (b) => {
              const trip = await tripView(b);
              return bookingFacts(b, trip, tripChecklist(trip));
            }),
          );
          return { bookings };
        },
      }),
      getTours: tool({
        description: "Elite Travel-ийн аяллын мэдээлэл (үнэ ₮, огноо, үлдсэн суудал, хугацаа, хөтөлбөр, багтсан/багтаагүй, урьдчилгаа %) авах. query хоосон бол бүх аялал.",
        inputSchema: z.object({ query: z.string().optional().describe('ж: "бали", "хайнань", "weeknd", id') }),
        execute: async ({ query }) => {
          const found = findTours(live, query);
          return {
            phone: PHONE,
            installment_partners: PARTNERS,
            tours: (found.length ? found : live).map((t) => ({
              id: t.id,
              link: `/tours/${t.id}`,
              title: t.title,
              destination: t.destination,
              price: t.price == null ? "Удахгүй" : formatPrice(t.price),
              old_price: t.oldPrice ? formatPrice(t.oldPrice) : null,
              duration: t.duration,
              dates: t.dates ?? null,
              seats_left: seats[t.id] ?? null,
              bookable: isBookable(t),
              deposit_percent: t.pricing?.depositPercent ?? null,
              single_room_supplement: t.pricing?.singleSupplement ? formatPrice(t.pricing.singleSupplement) : null,
              child_shared_bed_price: t.pricing?.childSharedBed ? formatPrice(t.pricing.childSharedBed) : null,
              child_note: t.pricing?.child ?? null,
              departure: t.departure ?? null,
              stay: t.stay ?? null,
              highlights: t.highlights,
              includes: t.includes,
              excludes: t.excludes,
              notes: t.notes ?? [],
              itinerary: t.itinerary.map((d) => `${d.day}: ${d.title}`),
            })),
          };
        },
      }),
      estimatePayment: tool({
        description: "Нийт дүн, урьдчилгаа төлбөрийг сайтын захиалгын тооцоолууртай ижил дүрмээр тооцох (урьдчилсан тооцоо).",
        inputSchema: z.object({
          tourId: z.string().describe("getTours-оос авсан id"),
          adults: z.number().int().min(1).max(30),
          kidsOwnBed: z.number().int().min(0).max(30).optional().describe("2–12 насны, тусдаа ортой хүүхэд (том хүний үнээр)"),
          kidsSharedBed: z.number().int().min(0).max(30).optional().describe("2–12 насны, эцэг эхтэйгээ нэг оронд унтах хүүхэд"),
          singleRooms: z.number().int().min(0).max(30).optional().describe("ганцаараа өрөөнд байрлах том хүний тоо"),
          date: z.string().optional().describe("сонгосон хөдлөх огнооны label (жишээ: 12/12 – 12/19); огноо бүрийн үнэ өөр байж болно"),
        }),
        execute: async ({ tourId, adults, kidsOwnBed = 0, kidsSharedBed = 0, singleRooms = 0, date }) => {
          const tour = getTour(live, tourId);
          if (!tour) return { ok: false, error: "tour_not_found" };
          if (tour.price == null && !(date && tour.datePrices?.[date]?.price != null)) return { ok: false, error: "price_unknown", contact: PHONE };
          const q = quote(tour, { adults, kidsOwnBed, kidsSharedBed, singleRooms }, date);
          return {
            ok: true,
            tour: tour.title,
            date: date ?? null,
            lines: q.lines.map((l) => `${l.label} = ${formatPrice(l.amount)}`),
            total: formatPrice(q.total),
            deposit: q.deposit ? formatPrice(q.deposit) : null,
            deposit_percent: tour.pricing?.depositPercent ?? null,
            remaining: formatPrice(q.total - q.deposit),
            installment_partners: PARTNERS,
            note: "Тооцоолол урьдчилсан, эцсийн дүнг Elite Travel-ийн баг баталгаажуулна.",
          };
        },
      }),
    },
    onFinish: async ({ text }) => {
      if (process.env.CHAT_LOGS !== "on") return;
      const db = supabaseAdmin();
      if (!db) return;
      const question = textOf(recent[recent.length - 1]).slice(0, 2000);
      const history = recent.map((m) => ({ role: m.role, content: textOf(m).slice(0, 2000) }));
      const { error } = await db.from("chat_logs").insert({ question, answer: text.slice(0, 8000), messages: history });
      if (error) console.error("chat log insert failed", error.code, error.message);
    },
    onError: ({ error }) => void reportError("chat assistant failed", error),
  });

  return result.toUIMessageStreamResponse();
}
