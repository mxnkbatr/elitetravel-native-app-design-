/** Contract template placeholders and rendering. Shared by /admin (editing, preview) and the API (signing). */

export type ContractTemplate = { body: string; version: string; published: boolean };

export const PLACEHOLDERS: { key: string; label: string }[] = [
  { key: "booking_id", label: "Захиалгын дугаар" },
  { key: "name", label: "Захиалагчийн нэр" },
  { key: "phone", label: "Утас" },
  { key: "tour", label: "Аяллын нэр" },
  { key: "dates", label: "Аяллын огноо" },
  { key: "travellers", label: "Зорчигчдын тоо" },
  { key: "total", label: "Нийт үнэ" },
  { key: "deposit", label: "Урьдчилгаа" },
  { key: "today", label: "Өнөөдрийн огноо" },
];

/**
 * Starting point only — NOT legal advice. Kept unpublished until the owner has had it reviewed,
 * edited the bracketed parts and pressed «Нийтлэх».
 */
export const DRAFT_TEMPLATE: ContractTemplate = {
  version: "draft-1",
  published: false,
  body: `АЯЛАЛ ЖУУЛЧЛАЛЫН ҮЙЛЧИЛГЭЭНИЙ ГЭРЭЭ № {{booking_id}}

Огноо: {{today}}

1. Талууд
1.1. Үйлчилгээ үзүүлэгч: [Компанийн бүтэн нэр, регистрийн дугаар, хаяг] (цаашид «Компани»).
1.2. Захиалагч: {{name}}, утас {{phone}} (цаашид «Захиалагч»).

2. Гэрээний зүйл
2.1. Компани нь «{{tour}}» аяллыг {{dates}} хугацаанд {{travellers}} зорчигчид аяллын хөтөлбөрт заасны дагуу зохион байгуулна.
2.2. Аяллын хөтөлбөр, үнэд багтсан болон багтаагүй зүйлс нь elitetravel.mn сайт дахь тухайн аяллын хуудсанд заасны дагуу байх бөгөөд энэ гэрээний салшгүй хэсэг болно.

3. Үнэ, төлбөр
3.1. Аяллын нийт үнэ: {{total}}.
3.2. Урьдчилгаа: {{deposit}}. Үлдэгдлийг [хугацаа] -ны дотор төлнө.

4. Цуцлалт, буцаалт
4.1. [Компанийн цуцлалт, буцаалтын нөхцөлийг энд бичнэ: хэдэн хоногийн өмнө цуцалбал хэдэн хувь буцаах гэх мэт.]

5. Талуудын эрх, үүрэг
5.1. Компани нь хөтөлбөрт заасан үйлчилгээг чанартай үзүүлэх, өөрчлөлт гарвал Захиалагчид цаг алдалгүй мэдэгдэх үүрэгтэй.
5.2. Захиалагч нь хүчинтэй паспорт болон шаардлагатай бичиг баримтаа хугацаанд нь бүрдүүлж өгөх, хүлээн авагч улсын хууль журмыг дагаж мөрдөх үүрэгтэй.

6. Бусад
6.1. Энэ гэрээтэй холбоотой маргааныг талууд харилцан тохиролцох замаар, эс бөгөөс Монгол Улсын хууль тогтоомжийн дагуу шийдвэрлэнэ.
6.2. Захиалагч энэ гэрээг цахимаар уншиж танилцан, гарын үсэг зурснаар гэрээ хүчин төгөлдөр болно.`,
};

export type ContractValues = Record<(typeof PLACEHOLDERS)[number]["key"], string>;

export function renderContract(body: string, values: ContractValues) {
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k: string) => (k in values ? values[k as keyof ContractValues] : m));
}

/** Bracketed parts left to fill in, so an unfinished draft cannot be published. */
export const unfilledParts = (body: string) => body.match(/\[[^\]]{3,}\]/g) ?? [];
