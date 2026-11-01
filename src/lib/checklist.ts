import { formatPrice } from "@/data/tours";
import { docInfo } from "@/lib/documents";
import { INSTALLMENT_PROVIDERS, partySize, passengerIssue, type Trip } from "@/lib/trips";

/**
 * What a traveller still has to do for one booking, in the order they should do it.
 * Built only from the booking's own data (no passport numbers or names), so it can be
 * shown to the traveller, sent in reminders, and given to the AI assistant as facts.
 */

export type ChecklistItem = {
  key: "payment" | "passengers" | "documents" | "care" | "contract";
  /** Booking-page section the traveller opens to do it */
  section: string;
  done: boolean;
  /** Short line: what to do */
  label: string;
  /** Specifics: which traveller, which document, why it was sent back */
  details: string[];
};

export function tripChecklist(trip: Trip, now = new Date()): ChecklistItem[] {
  if (trip.status === "cancelled" || trip.status === "waitlist") return [];
  const items: ChecklistItem[] = [];

  const due = trip.payOptions[0];
  items.push({
    key: "payment",
    section: "Төлбөр",
    done: !due,
    label: due
      ? `${due.label === "Урьдчилгаа" ? "Урьдчилгаа" : "Төлбөр"} ${formatPrice(due.amount)} төлөх`
      : trip.paidAmount >= trip.total
        ? "Төлбөр бүрэн төлөгдсөн"
        : "Төлбөр хийгдсэн",
    details:
      due && trip.installment
        ? [`${INSTALLMENT_PROVIDERS.find((p) => p.id === trip.installment?.provider)?.name ?? trip.installment.provider}-ээр хуваан төлөх хүсэлт явж байна`]
        : [],
  });

  const count = partySize(trip);
  const passengerIssues = Array.from({ length: count }, (_, i) => {
    const p = trip.passengers[i];
    const issue = p ? passengerIssue(p, trip.travelDate, now) : "Мэдээлэл оруулаагүй";
    return issue ? `Зорчигч ${i + 1}: ${issue}` : null;
  }).filter((x): x is string => x != null);
  items.push({
    key: "passengers",
    section: "Зорчигчид",
    done: passengerIssues.length === 0,
    label: passengerIssues.length ? "Зорчигчдын паспортын мэдээлэл бөглөх" : "Паспортын мэдээлэл бүрэн",
    details: passengerIssues,
  });

  if (trip.documents.length) {
    const missing = trip.documents.filter((d) => d.status == null || d.status === "rejected");
    items.push({
      key: "documents",
      section: "Бичиг баримт",
      done: missing.length === 0,
      label: missing.length ? "Бичиг баримт хуулах" : "Бичиг баримт илгээсэн",
      details: missing.map((d) => {
        const name = `${docInfo(d.type)?.label ?? d.type}${d.label ? ` (${d.label})` : ""}`;
        return d.status === "rejected" ? `${name}: дахин илгээх${d.note ? ` — ${d.note}` : ""}` : `${name}: хуулаагүй`;
      }),
    });
  }

  items.push({
    key: "care",
    section: "Нэмэлт мэдээлэл",
    done: trip.care != null,
    label: trip.care ? "Яаралтай үед холбогдох хүн бүртгэлтэй" : "Яаралтай үед холбогдох хүн, хоол, эрүүл мэндийн мэдээлэл бөглөх",
    details: [],
  });

  if (trip.contract.state !== "unavailable") {
    items.push({
      key: "contract",
      section: "Аяллын гэрээ",
      done: trip.contract.state === "signed",
      label: trip.contract.state === "signed" ? "Гэрээнд гарын үсэг зурсан" : "Аяллын гэрээг уншиж гарын үсэг зурах",
      details: [],
    });
  }

  return items;
}

/** The open items as a plain list for a chat message. */
export function checklistText(items: ChecklistItem[]) {
  return items
    .filter((i) => !i.done)
    .map((i) => [`• ${i.label} («${i.section}» хэсэг)`, ...i.details.map((d) => `   – ${d}`)].join("\n"))
    .join("\n");
}
