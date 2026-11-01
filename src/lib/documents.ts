/** Documents a tour can ask travellers for. Shared by the traveller app, the API and /admin. */

export type DocType = "passport_copy" | "id_card" | "visa_photo" | "employment_letter" | "bank_statement" | "birth_certificate" | "minor_consent";

/** each = every traveller · adult = adults only · child = children only */
type Scope = "each" | "adult" | "child";

export const DOC_TYPES: { type: DocType; label: string; hint: string; scope: Scope }[] = [
  { type: "passport_copy", label: "Паспортын зургийн хуудас", hint: "Зурагтай хуудас бүтэн, тод харагдахаар", scope: "each" },
  { type: "id_card", label: "Иргэний үнэмлэх", hint: "Урд, ар талыг нэг зурагт эсвэл PDF", scope: "adult" },
  { type: "visa_photo", label: "Визийн зураг 3.5×4.5", hint: "Цагаан дэвсгэртэй, сүүлийн 6 сард авахуулсан", scope: "each" },
  { type: "employment_letter", label: "Ажлын газрын тодорхойлолт", hint: "Тамгатай, сүүлийн 1 сард гарсан", scope: "adult" },
  { type: "bank_statement", label: "Банкны хуулга", hint: "Сүүлийн 3–6 сарын, банкны тамгатай", scope: "adult" },
  { type: "birth_certificate", label: "Төрсний гэрчилгээ", hint: "Хүүхэд бүрийн", scope: "child" },
  { type: "minor_consent", label: "Эцэг/эхийн зөвшөөрөл (нотариат)", hint: "Хуулбарыг энд, эх хувийг хилээр гарахдаа биедээ авч явна", scope: "child" },
];

export const docInfo = (type: string) => DOC_TYPES.find((d) => d.type === type);

export const isDocType = (v: unknown): v is DocType => DOC_TYPES.some((d) => d.type === v);

export type DocSlot = { type: DocType; slot: number; label: string };

/** Expands a tour's required documents into one slot per traveller it applies to. */
export function documentSlots(types: DocType[] | undefined, party: { adults: number; kids: number }): DocSlot[] {
  const slots: DocSlot[] = [];
  for (const d of DOC_TYPES) {
    if (!types?.includes(d.type)) continue;
    const count = d.scope === "each" ? party.adults + party.kids : d.scope === "adult" ? party.adults : party.kids;
    for (let i = 0; i < count; i++) {
      const who = d.scope === "child" ? `Хүүхэд ${i + 1}` : d.scope === "adult" ? `Том хүн ${i + 1}` : `Зорчигч ${i + 1}`;
      slots.push({ type: d.type, slot: i, label: count > 1 ? who : "" });
    }
  }
  return slots;
}

export type DocStatus = "pending" | "approved" | "rejected";

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  pending: "Шалгаж байна",
  approved: "Зөвшөөрсөн",
  rejected: "Дахин илгээх",
};

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const UPLOAD_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

/** Emergency contact and needs, filled once per booking. */
export type Care = {
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation?: string;
  diet?: string;
  medical?: string;
  mobility?: string;
};
