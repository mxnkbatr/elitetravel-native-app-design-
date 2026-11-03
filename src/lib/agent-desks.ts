import { can, type Permission, type Role } from "@/lib/permissions";

/** The admin agent's four desks. Each has its own focus, tools and saved chats. No server-only imports. */

export const DESKS = ["bookings", "chats", "site", "boost"] as const;
export type Desk = (typeof DESKS)[number];

export const isDesk = (v: unknown): v is Desk => DESKS.includes(v as Desk);

export const deskHref = (desk: Desk) => `/admin/agent/${desk}`;

/** Opening a desk needs this on top of agent.use. */
export const DESK_PERMISSION: Record<Desk, Permission> = {
  bookings: "bookings.view",
  chats: "bookings.view",
  site: "agent.use",
  boost: "content.manage",
};

export const DESK_INFO: Record<Desk, { title: string; sub: string; placeholder: string }> = {
  bookings: {
    title: "Бүртгэлийн AI",
    sub: "Шинэ хүсэлт, төлөв, суудал, дутуу баримтыг хянана. Төлөв солих, аялагчид бичих саналыг та зөвшөөрсний дараа л хийнэ.",
    placeholder: "Жишээ: ET-… захиалгыг баталгаажуул, өнөөдрийн шинэ хүсэлтүүд…",
  },
  chats: {
    title: "Чатын AI",
    sub: "Аялагчдаас ирсэн чат, сайтын туслахаас юу асууж байгааг нэгтгэж, хариу бэлдэнэ. Илгээхээс өмнө та уншаад зөвшөөрнө.",
    placeholder: "Жишээ: хариулаагүй чатуудад хариу бэлд…",
  },
  site: {
    title: "Сайтын AI",
    sub: "Аялал, мэдээ, огноо, хандалт, борлуулалт — сайтын бүх үйл ажиллагаа. Өөрчлөлтийг та зөвшөөрсний дараа л хадгална.",
    placeholder: "Асуулт эсвэл даалгавар…",
  },
  boost: {
    title: "Boost AI",
    sub: "Instagram, Facebook пост хэнд, ямар төсвөөр хүргэхийг төлөвлөж, Meta холбогдсоны дараа өөрөө boost хийнэ.",
    placeholder: "Жишээ: Бали аяллын постыг УБ-ийн 20–35 насныханд хүргэе…",
  },
};

export function deskSuggestions(desk: Desk, role: Role): string[] {
  const s: string[] = [];
  switch (desk) {
    case "bookings":
      s.push("Өнөөдөр хийх ажлуудыг жагсаа: шинэ хүсэлт, хариулаагүй чат, дутуу баримт", "2-оос дээш цаг хүлээсэн шинэ хүсэлтүүд байна уу?");
      if (can(role, "departures.manage")) s.push("Аль огноонуудад суудал дуусах гэж байна?");
      if (can(role, "reports.view")) s.push("Энэ сарын захиалгыг аяллаар нь задал");
      break;
    case "chats":
      s.push("Хариулаагүй чатуудыг хураангуйлаад хариу бэлд", "Сүүлийн долоо хоногт аялагчид юуг хамгийн их асууж байна?");
      if (can(role, "chatlogs.view")) s.push("Сайтын AI туслахаас хүмүүс юу асууж байна, ямар мэдээлэл дутуу байна?");
      break;
    case "site":
      if (can(role, "reports.view")) s.push("Сүүлийн 30 хоногт сайтад хэдэн хүн орж, хаанаас ирсэн бэ?", "Энэ сарын борлуулалтыг өмнөх сартай харьцуул");
      if (can(role, "content.manage")) s.push("Бали аяллын товч тайлбарыг илүү сонирхолтой болгох санал бэлд", "Ямар аяллууд дууссан, ямар нь захиалга авч байна?");
      if (can(role, "bookings.view")) s.push("Энэ долоо хоногт ирсэн захиалгуудыг харуул");
      break;
    case "boost":
      s.push("Аль аяллыг одоо boost хийвэл хамгийн их ашигтай вэ?", "Instagram, Facebook-ээс сайтад хэдэн хүн орж байна?", "Хайнань аяллын постыг бага төсвөөр олон хүнд хүргэх төлөвлөгөө гарга");
      break;
  }
  return s.slice(0, 4);
}
