/** Staff roles and what each may do in /admin. Shared by the server guards and the nav. */

export type Role = "owner" | "sales" | "finance" | "content";

export const ROLES: Role[] = ["owner", "sales", "finance", "content"];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Эзэн",
  sales: "Борлуулалт",
  finance: "Санхүү",
  content: "Контент",
};

export const ROLE_HINT: Record<Role, string> = {
  owner: "Бүх эрх, ажилтан нэмэх, бүртгэл харах",
  sales: "Захиалга, чат, төлөв, огноо, паспорт",
  finance: "Төлбөр, дүн засах, И-баримт, тайлан",
  content: "Аялал, мэдээ, постер",
};

export type Permission =
  | "bookings.view"
  | "bookings.manage"
  | "money.manage"
  | "departures.manage"
  | "passports.view"
  | "content.manage"
  | "reports.view"
  | "chatlogs.view"
  | "staff.manage"
  | "audit.view"
  /** The AI assistant in /admin/agent; each of its tools still needs its own permission */
  | "agent.use";

const GRANTS: Record<Role, readonly Permission[] | "all"> = {
  owner: "all",
  sales: ["bookings.view", "bookings.manage", "departures.manage", "passports.view", "chatlogs.view", "agent.use"],
  finance: ["bookings.view", "money.manage", "reports.view", "agent.use"],
  content: ["content.manage", "chatlogs.view", "agent.use"],
};

export function can(role: Role | null | undefined, permission: Permission) {
  if (!role) return false;
  const granted = GRANTS[role];
  return granted === "all" || granted.includes(permission);
}

/** Permission needed to open each admin screen (longest prefix wins; "/admin" itself is exact). */
const ROUTES: [string, Permission][] = [
  ["/admin/staff", "staff.manage"],
  ["/admin/contract", "staff.manage"],
  ["/admin/contracts", "bookings.view"],
  ["/admin/documents", "passports.view"],
  ["/admin/audit", "audit.view"],
  ["/admin/errors", "audit.view"],
  ["/admin/payments", "money.manage"],
  ["/admin/reports", "reports.view"],
  ["/admin/departures", "departures.manage"],
  ["/admin/tours", "content.manage"],
  ["/admin/news", "content.manage"],
  ["/admin/poster", "content.manage"],
  ["/admin/chat-logs", "chatlogs.view"],
  ["/admin/agent", "agent.use"],
];

export function routePermission(path: string): Permission {
  if (path === "/admin") return "bookings.view";
  return ROUTES.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1] ?? "bookings.view";
}

/** Where a role lands after signing in, or when it opens a screen it cannot use. */
export function homeFor(role: Role) {
  if (can(role, "bookings.view")) return "/admin";
  if (can(role, "content.manage")) return "/admin/tours";
  return "/admin/chat-logs";
}
