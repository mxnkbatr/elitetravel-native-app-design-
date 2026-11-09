import "server-only";

import { createXai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";

type Effort = "none" | "low" | "medium" | "high";

function xai(model: string): LanguageModel | null {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;
  return createXai({ apiKey: key }).responses(model);
}

/**
 * Public site chat + booking auto-replies.
 * Default grok-4.3 (~½ of 4.7). Override with XAI_SITE_MODEL.
 */
export function siteModel(): LanguageModel | null {
  const named = process.env.XAI_SITE_MODEL || process.env.XAI_MODEL || "grok-4.3";
  const model = xai(named);
  if (model) return model;
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_MODEL || "openai/gpt-4o-mini";
  return null;
}

/**
 * Staff Elite Travel Agentic AI.
 * Default grok-4.3 + low reasoning. Set XAI_AGENT_MODEL=grok-4.7 only when you need the flagship.
 */
export function agentModel(): LanguageModel | null {
  const named = process.env.XAI_AGENT_MODEL || process.env.XAI_MODEL || "grok-4.3";
  return xai(named) ?? siteModel();
}

/** @deprecated Prefer siteModel() / agentModel() — kept for older call sites. */
export function chatModel(): LanguageModel | null {
  return siteModel();
}

/** Site chat: no deep reasoning — short FAQ answers. */
export const chatProviderOptions = { xai: { reasoningEffort: "none" as Effort } };

/** Admin agent: light reasoning is enough for tool use; medium burns tokens. */
export const agentProviderOptions = { xai: { reasoningEffort: (process.env.XAI_AGENT_EFFORT as Effort) || "low" } };

export const PHONE = "+976 9003 1771";

/** How Elite Travel works on the site and in the app; shared by every assistant prompt. */
export const SITE_GUIDE = `Elite Travel Mongolia (elitetravel.mn) — Улаанбаатараас гадаад руу аялал зохион байгуулдаг компани. Сайт болон «Elite Travel» апп нэг.

ЗАХИАЛГЫН ЯВЦ:
1. Аяллын хуудсан дээр «Захиалах» дарж огноо, хүний тоо, нэр, утсаа оруулна. Захиалгын код ET-XXXXXXXX хэлбэртэй.
2. Захиалга бүрийн хуудас («Миний захиалга» → тухайн захиалга, хаяг /bookings/<код>) дээр бүх зүйлийг хийнэ: төлөв, чат, төлбөр, зорчигчид, бичиг баримт, нэмэлт мэдээлэл, гэрээ.
3. Төлөв: Шинэ → Холбогдсон → Баталгаажсан → Төлсөн. Анхны төлбөр ормогц автоматаар баталгаажна, ажилтан товч дарах шаардлагагүй.

ТӨЛБӨР («Төлбөр» хэсэг):
- QPay: урьдчилгаа эсвэл бүтэн дүнгээр, QR эсвэл банкны аппаар. Төлмөгц шууд бүртгэгдэж И-баримт автоматаар гарна.
- Хуваан төлөх: Pocket, Toki, Simple, Dari. Аялагч хүсэлт илгээхэд манай ажилтан тухайн апп руу нэхэмжлэх явуулна, аялагч аппаа нээж баталгаажуулна. Хүү, хугацааг тухайн компани тогтооно.
- Үлдэгдлийг хөдлөхөөс 14 хоногийн өмнө төлж дуусгана.

АЯЛАЛД БЭЛТГЭХ:
- «Зорчигчид»: зорчигч бүрийн паспортын мэдээлэл (латинаар, паспорт дээрхтэй яг адил). Паспортын зургийг камераар уншуулж автоматаар бөглөж болно. Паспорт хөдлөхөөс хойш 6 сараас дээш хүчинтэй байх ёстой.
- «Бичиг баримт»: аялал бүрт шаардлагатай баримтуудыг (паспортын хуулбар, визийн зураг, ажлын тодорхойлолт, банкны хуулга, хүүхдийн төрсний гэрчилгээ, эцэг/эхийн нотариатын зөвшөөрөл г.м.) утаснаасаа зураг эсвэл PDF-ээр хуулна. Визийн зургийг (цагаан дэвсгэр, 3.5×4.5) апп автоматаар шалгана. Ажилтан шалгаад зөвшөөрнө эсвэл шалтгаантай буцаана.
- Хүүхэд нэг эцэг/эхтэйгээ эсвэл эцэг эхгүй явбал нөгөө эцэг/эхийн нотариатаар батлуулсан зөвшөөрөл хэрэгтэй.
- «Нэмэлт мэдээлэл»: яаралтай үед холбогдох хүн, хоолны онцлог, эрүүл мэнд, хөдөлгөөний хязгаарлалт.
- «Аяллын гэрээ»: уншаад хуруугаараа гарын үсэг зурна, PDF болгон хадгалж болно.
- Паспорт, баримт, эрүүл мэндийн мэдээлэл шифрлэгдэж хадгалагдах ба зөвхөн Elite Travel-ийн эрхтэй ажилтан харна. Паспортын мэдээллээ «Зорчигчид» хэсгээс хүссэн үедээ устгаж болно.
- Аппад «Мэдэгдэл асаах» дарвал хариу, төлбөр, сануулгыг утсандаа авна.

ХОЛБОО БАРИХ: утас ${PHONE}, Instagram @elitetravelmn. Захиалгын чатад бичсэнийг манай ажилтан харна.`;
