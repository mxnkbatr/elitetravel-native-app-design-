import "server-only";

import { formatPrice, getTour, type Tour } from "@/data/tours";
import { checklistText, tripChecklist, type ChecklistItem } from "@/lib/checklist";
import { daysUntil } from "@/lib/dates";
import { chatModel, chatProviderOptions, PHONE, SITE_GUIDE } from "@/lib/server/ai";
import { getTours } from "@/lib/server/content";
import { tripView } from "@/lib/server/trip-view";
import { BOOKING_COLUMNS, db, postMessage, type BookingRow } from "@/lib/server/trips";
import { STATUS_LABEL, type Trip } from "@/lib/trips";
import { generateText, Output } from "ai";
import { z } from "zod";

/**
 * Grok answers travellers in their booking chat and writes reminder intros. It only sees
 * this booking's facts (first name, status, amounts, the checklist), never passport data.
 */

export const AI_MARK = "🤖";
/** Staff who replied this recently are mid-conversation: the assistant stays out. */
const STAFF_ACTIVE_MS = 15 * 60_000;

export const tripRepliesEnabled = () => process.env.AI_TRIP_REPLIES !== "off" && chatModel() != null;

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** The booking as plain facts for the model. */
export function bookingFacts(b: Pick<BookingRow, "id" | "name">, trip: Trip, items: ChecklistItem[], tour?: Tour) {
  const days = daysUntil(trip.travelDate ?? undefined);
  return {
    booking: trip.id,
    traveller_first_name: firstName(b.name),
    tour: trip.tourTitle,
    page: `/bookings/${trip.id}`,
    travel_date: trip.travelDate,
    days_until_departure: days,
    status: STATUS_LABEL[trip.status],
    travellers: { adults: trip.adults, kids_own_bed: trip.kidsOwnBed, kids_shared_bed: trip.kidsSharedBed, single_rooms: trip.singleRooms },
    total: formatPrice(trip.total),
    paid: formatPrice(trip.paidAmount),
    remaining: formatPrice(Math.max(0, trip.total - trip.paidAmount)),
    checklist: items.map((i) => ({ section: i.section, done: i.done, task: i.label, details: i.details })),
    tour_info: tour
      ? {
          duration: tour.duration,
          departure: tour.departure ?? null,
          stay: tour.stay ?? null,
          includes: tour.includes,
          excludes: tour.excludes,
          notes: tour.notes ?? [],
          itinerary: tour.itinerary.map((d) => `${d.day}: ${d.title}`),
        }
      : null,
  };
}

const RULES = `ДҮРЭМ:
- Зөвхөн доорх ЗАХИАЛГЫН МЭДЭЭЛЭЛ болон сайтын тайлбарт тулгуурла. Үнэ, огноо, виз, нислэгийн цаг, буцаан олголт зэргийг ХЭЗЭЭ Ч зохиохгүй.
- Мэдээлэлд байхгүй, ажилтны шийдвэр шаардсан (цуцлах, огноо солих, хөнгөлөлт, буцаан олголт, гомдол, визийн дэлгэрэнгүй) асуултад handoff=true болгож "манай ажилтан хариулна" гэж товч хэл.
- Аялагч юу дутуу байгааг асуувал checklist-ийн done=false зүйлсийг яг ямар хэсэгт («...» хэсэг) хийхийг жагсааж хэл.
- Монгол хэлээр (кирилл), найрсаг, товч: 80 үгнээс бүү хэтрүүл. Аялагчийг нэрээр нь дуудаж болно.
- Markdown (**, #) бүү ашигла: энгийн текст, жагсаалтыг "• " тэмдэгээр.
- Баярлалаа, ойлголоо гэх мэт хариу шаардлагагүй мессежид reply хоосон, handoff=false.`;

/**
 * Replies to the traveller's latest message in their booking chat, unless staff are
 * already talking to them or a newer message arrived meanwhile.
 */
export async function assistantReply(bookingId: string) {
  const model = chatModel();
  if (!model || !tripRepliesEnabled()) return;
  const client = db();
  const [{ data: booking }, { data: recent }] = await Promise.all([
    client.from("booking_requests").select(BOOKING_COLUMNS).eq("id", bookingId).maybeSingle(),
    client.from("booking_messages").select("id, sender, body, created_at").eq("booking_id", bookingId).order("created_at", { ascending: false }).limit(14),
  ]);
  const last = recent?.[0];
  if (!booking || !last || last.sender !== "traveller") return;
  if ((recent ?? []).some((m) => m.sender === "staff" && Date.now() - new Date(m.created_at).getTime() < STAFF_ACTIVE_MS)) return;

  const b = booking as BookingRow;
  const trip = await tripView(b);
  const items = tripChecklist(trip);
  const facts = bookingFacts(b, trip, items, getTour(await getTours(), b.tour_id));
  const history = [...(recent ?? [])]
    .reverse()
    .map((m) => `${m.sender === "traveller" ? "Аялагч" : m.sender === "staff" ? "Ажилтан" : m.body.startsWith(AI_MARK) ? "Туслах" : "Систем"}: ${m.body}`)
    .join("\n");

  const { output } = await generateText({
    model,
    providerOptions: chatProviderOptions,
    timeout: 25_000,
    maxOutputTokens: 600,
    output: Output.object({ schema: z.object({ reply: z.string().max(1500), handoff: z.boolean() }) }),
    system: `Та бол Elite Travel-ийн захиалгын чатад аялагчид хариулдаг AI туслах.\n\n${SITE_GUIDE}\n\n${RULES}`,
    prompt: `ЗАХИАЛГЫН МЭДЭЭЛЭЛ:\n${JSON.stringify(facts)}\n\nЧАТ (хуучнаас шинэ рүү):\n${history}\n\nСүүлийн аялагчийн мессежид хариул.`,
  });
  const reply = (output?.reply ?? "").replace(/\*\*|__|^#+\s*/gm, "").trim();
  if (!reply) return;

  const { data: newest } = await client.from("booking_messages").select("id").eq("booking_id", bookingId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (newest?.id !== last.id) return;
  const body = `${AI_MARK} ${reply}${output?.handoff ? "\n\nМанай ажилтан удахгүй энд нэмж хариулна." : ""}`;
  await postMessage(bookingId, "system", body, { author: "ai", push: false });
}

/** A short personal opening for a reminder; the list itself is always the exact checklist. */
export async function reminderIntro(name: string, trip: Trip, days: number) {
  const fallback = `Сайн байна уу, ${firstName(name)}! «${trip.tourTitle}» аялалд ${days} хоног үлдлээ. Аялалд бэлтгэхэд дараах зүйлс дутуу байна:`;
  const model = chatModel();
  if (!model) return fallback;
  try {
    const { text } = await generateText({
      model,
      providerOptions: chatProviderOptions,
      timeout: 15_000,
      maxOutputTokens: 120,
      system: "Elite Travel-ийн аялагчид илгээх сануулгын эхний 1–2 өгүүлбэрийг монголоор (кирилл), найрсаг, товч бич. Үнэ, огноо, шинэ мэдээлэл бүү нэм. Жагсаалт бүү бич — жагсаалт доор нь тусад нь орно. Төгсгөлд нь «дараах зүйлс дутуу байна:» гэх утгатай өгүүлбэрээр дуусга.",
      prompt: JSON.stringify({ first_name: firstName(name), tour: trip.tourTitle, days_until_departure: days }),
    });
    const intro = text.trim();
    return intro && intro.length <= 400 && !intro.includes("•") ? intro : fallback;
  } catch (e) {
    console.error("reminder intro failed", e instanceof Error ? e.message : e);
    return fallback;
  }
}

/** Reminder body: personal intro + the exact open checklist + where to get help. */
export async function checklistReminder(b: BookingRow, days: number) {
  const trip = await tripView(b);
  const open = tripChecklist(trip).filter((i) => !i.done && i.key !== "payment");
  if (!open.length) return null;
  return `${await reminderIntro(b.name, trip, days)}\n${checklistText(open)}\n\nАсуух зүйл байвал энд бичээрэй эсвэл ${PHONE} руу залгаарай.`;
}
