import {
  AlertIcon,
  CardIcon,
  ChartIcon,
  ChatIcon,
  CompassIcon,
  ImageIcon,
  ListIcon,
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
    title: "Өдөр тутам",
    items: [
      // First: staff start here and ask the agent instead of hunting through screens
      {
        href: "/admin/agent",
        label: "Elite AI",
        hint: "Elite Travel Agentic AI: асуух, даалгавар өгөх",
        icon: SparkIcon,
        keywords: "ai grok agent tuslah agentic chat boost",
      },
      { href: "/admin", label: "Захиалга", hint: "Хүсэлт, аялагч нэмэх, чат", icon: TicketIcon, keywords: "booking zahialga chat aylagch" },
      { href: "/admin/payments", label: "Төлбөр", hint: "QPay, хуваан төлөх, И-баримт", icon: CardIcon, keywords: "qpay pocket toki ebarimt tulbur" },
      { href: "/admin/departures", label: "Аялагчид", hint: "Аялал → хүмүүс → мэдээлэл", icon: PlaneIcon, keywords: "seats suudal ognoo manifest aylagch" },
    ],
  },
  {
    title: "Сайт",
    items: [
      { href: "/admin/tours", label: "Аялал нэмэх", hint: "Аялал бичих, засах", icon: CompassIcon, keywords: "tour ayalal" },
      { href: "/admin/news", label: "Мэдээ бичих", hint: "Нийтлэл, урамшуулал", icon: NewsIcon, keywords: "news medee" },
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
export const PHONE_TABS = ["/admin/agent", "/admin", "/admin/departures", "/admin/tours"];

export const navAllowed = (role: Role, item: NavItem) => can(role, routePermission(item.href));

export const navFor = (role: Role) =>
  NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => navAllowed(role, i)) })).filter((g) => g.items.length);

export const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
