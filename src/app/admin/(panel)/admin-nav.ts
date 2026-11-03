import {
  AlertIcon,
  CardIcon,
  ChartIcon,
  ChatIcon,
  CompassIcon,
  ImageIcon,
  ListIcon,
  MegaphoneIcon,
  NewsIcon,
  PlaneIcon,
  SparkIcon,
  TicketIcon,
  UsersIcon,
  type IconProps,
} from "@/app/admin/(panel)/icons";
import { can, routePermission, type Role } from "@/lib/permissions";
import type { ComponentType } from "react";

/** Every admin screen, grouped by the job it serves. Shared by the sidebar, the phone menu and the command palette. */
export type NavItem = { href: string; label: string; hint: string; icon: ComponentType<IconProps>; keywords?: string };

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "AI туслахууд",
    items: [
      { href: "/admin/agent/bookings", label: "Бүртгэл", hint: "Бүртгэлийн AI: хүсэлт, төлөв, суудал, дутуу баримт", icon: TicketIcon, keywords: "ai burtgel booking zahialga status" },
      { href: "/admin/agent/chats", label: "Чат", hint: "Чатын AI: аялагчдаас ирсэн чат, хариу бэлдэх", icon: ChatIcon, keywords: "ai chat message hariu" },
      { href: "/admin/agent/site", label: "Сайт", hint: "Сайтын AI: аялал, мэдээ, хандалт, борлуулалт", icon: SparkIcon, keywords: "ai grok agent tuslah site" },
      { href: "/admin/agent/boost", label: "Boost", hint: "Boost AI: Instagram, Facebook сурталчилгаа", icon: MegaphoneIcon, keywords: "ai boost instagram facebook ads meta" },
    ],
  },
  {
    title: "Өдөр тутам",
    items: [
      { href: "/admin", label: "Захиалга", hint: "Хүсэлт, чат, төлөв, баримт", icon: TicketIcon, keywords: "booking zahialga chat" },
      { href: "/admin/payments", label: "Төлбөр", hint: "QPay, хуваан төлөх, И-баримт", icon: CardIcon, keywords: "qpay pocket toki ebarimt tulbur" },
      { href: "/admin/departures", label: "Огноо, суудал", hint: "Суудал, хүлээлэг, нислэгийн жагсаалт", icon: PlaneIcon, keywords: "seats suudal ognoo manifest" },
    ],
  },
  {
    title: "Сайт",
    items: [
      { href: "/admin/tours", label: "Аялал", hint: "Аялал нэмэх, засах, дараалал", icon: CompassIcon, keywords: "tour ayalal" },
      { href: "/admin/news", label: "Мэдээ", hint: "Нийтлэл, урамшуулал", icon: NewsIcon, keywords: "news medee" },
      { href: "/admin/poster", label: "Постер", hint: "Instagram-д тавих зураг үүсгэх", icon: ImageIcon, keywords: "poster instagram" },
      { href: "/admin/assistant", label: "Сайтын чат", hint: "Сайтын AI туслахын мэндчилгээ, асуулт, заавар", icon: ChatIcon, keywords: "chat tuslah assistant site greeting" },
    ],
  },
  {
    title: "Тайлан",
    items: [
      { href: "/admin/reports", label: "Тайлан", hint: "Хандалт, хөрвөлт, орлого", icon: ChartIcon, keywords: "report analytics tailan" },
      { href: "/admin/chat-logs", label: "Чат лог", hint: "Сайтын AI чатад юу асуусан", icon: ChatIcon, keywords: "chat log" },
    ],
  },
  {
    title: "Тохиргоо",
    items: [
      { href: "/admin/staff", label: "Ажилтнууд", hint: "Нэмэх, эрх олгох", icon: UsersIcon, keywords: "staff ajiltan role" },
      { href: "/admin/contract", label: "Гэрээний загвар", hint: "Аяллын гэрээний текст", icon: NewsIcon, keywords: "contract geree" },
      { href: "/admin/audit", label: "Үйлдлийн бүртгэл", hint: "Хэн, юу, хэзээ өөрчилсөн", icon: ListIcon, keywords: "audit log" },
      { href: "/admin/errors", label: "Алдаа", hint: "Сайтын алдааны бүртгэл", icon: AlertIcon, keywords: "error aldaa" },
    ],
  },
];

/** Bottom tabs on phones; the rest is in the «Цэс» sheet. */
export const PHONE_TABS = ["/admin/agent/bookings", "/admin/agent/chats", "/admin/agent/site", "/admin/agent/boost"];

export const navAllowed = (role: Role, item: NavItem) => can(role, routePermission(item.href));

export const navFor = (role: Role) =>
  NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => navAllowed(role, i)) })).filter((g) => g.items.length);

export const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
