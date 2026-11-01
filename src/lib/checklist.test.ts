import { checklistText, tripChecklist } from "@/lib/checklist";
import { payOptions, type Trip } from "@/lib/trips";
import { describe, expect, it } from "vitest";

const now = new Date("2026-11-01T00:00:00Z");

function trip(over: Partial<Trip> = {}): Trip {
  const base: Trip = {
    id: "ET-TEST",
    tourId: "bali",
    tourTitle: "Бали",
    travelDate: "2026-12-10",
    status: "confirmed",
    adults: 2,
    kidsOwnBed: 0,
    kidsSharedBed: 0,
    singleRooms: 0,
    total: 10_000_000,
    deposit: 3_000_000,
    paidAmount: 3_000_000,
    passengers: [],
    passportConsent: false,
    passportStorage: true,
    messages: [],
    invoice: null,
    payOptions: [],
    qpay: "live",
    receipts: [],
    installments: [],
    installment: null,
    documents: [],
    care: null,
    contract: { state: "unavailable" },
  };
  const t = { ...base, ...over };
  return { ...t, payOptions: over.payOptions ?? payOptions(t.status, t.total, t.deposit, t.paidAmount) };
}

const ready = { name: "BOLD BAT", gender: "M" as const, birth: "1990-01-01", passport: "E1234567", expiry: "2030-01-01" };

describe("tripChecklist", () => {
  it("lists balance, each traveller's passport, documents, care form and contract", () => {
    const items = tripChecklist(
      trip({
        passengers: [ready, { ...ready, expiry: "2027-02-01" }],
        documents: [
          { type: "visa_photo", slot: 0, label: "Зорчигч 1", status: "approved", note: null, uploadedAt: "x" },
          { type: "visa_photo", slot: 1, label: "Зорчигч 2", status: "rejected", note: "Дэвсгэр цагаан биш", uploadedAt: "x" },
          { type: "passport_copy", slot: 0, label: "Зорчигч 1", status: null, note: null, uploadedAt: null },
        ],
        contract: { state: "unsigned", body: "..." },
      }),
      now,
    );
    const open = Object.fromEntries(items.filter((i) => !i.done).map((i) => [i.key, i]));
    expect(Object.keys(open)).toEqual(["payment", "passengers", "documents", "care", "contract"]);
    expect(open.payment.label).toBe("Төлбөр ₮7'000'000 төлөх");
    expect(open.passengers.details).toEqual(["Зорчигч 2: Паспортын хугацаа 6 сараас бага үлдэнэ"]);
    expect(open.documents.details).toEqual([
      "Визийн зураг 3.5×4.5 (Зорчигч 2): дахин илгээх — Дэвсгэр цагаан биш",
      "Паспортын зургийн хуудас (Зорчигч 1): хуулаагүй",
    ]);
  });

  it("is all done for a paid, complete booking and hides sections the tour does not use", () => {
    const items = tripChecklist(
      trip({
        paidAmount: 10_000_000,
        status: "paid",
        passengers: [ready, ready],
        care: { emergencyName: "Дорж", emergencyPhone: "99887766" },
      }),
      now,
    );
    expect(items.every((i) => i.done)).toBe(true);
    expect(items.map((i) => i.key)).toEqual(["payment", "passengers", "care"]);
    expect(checklistText(items)).toBe("");
  });

  it("asks for the deposit first and counts missing travellers", () => {
    const items = tripChecklist(trip({ status: "new", paidAmount: 0, adults: 1, kidsOwnBed: 1 }), now);
    expect(items[0].label).toBe("Урьдчилгаа ₮3'000'000 төлөх");
    expect(items[1].details).toEqual(["Зорчигч 1: Мэдээлэл оруулаагүй", "Зорчигч 2: Мэдээлэл оруулаагүй"]);
  });

  it("has nothing to do for cancelled or waitlisted bookings", () => {
    expect(tripChecklist(trip({ status: "cancelled" }), now)).toEqual([]);
    expect(tripChecklist(trip({ status: "waitlist" }), now)).toEqual([]);
  });

  it("writes open items as a chat list with the section to open", () => {
    const text = checklistText(tripChecklist(trip({ passengers: [ready, ready], care: null }), now));
    expect(text).toBe("• Төлбөр ₮7'000'000 төлөх («Төлбөр» хэсэг)\n• Яаралтай үед холбогдох хүн, хоол, эрүүл мэндийн мэдээлэл бөглөх («Нэмэлт мэдээлэл» хэсэг)");
  });
});
