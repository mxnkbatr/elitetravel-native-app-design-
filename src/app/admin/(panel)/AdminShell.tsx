"use client";

import { adminPulse } from "@/app/admin/(panel)/actions";
import {
  BellIcon,
  CardIcon,
  ChartIcon,
  ChatIcon,
  CompassIcon,
  ExternalIcon,
  GridIcon,
  ImageIcon,
  LogoutIcon,
  NewsIcon,
  AlertIcon,
  ListIcon,
  PlaneIcon,
  TicketIcon,
  UsersIcon,
  type IconProps,
} from "@/app/admin/(panel)/icons";
import { Sheet } from "@/app/admin/(panel)/Sheet";
import { can, ROLE_LABEL, routePermission, type Role } from "@/lib/permissions";
import { disableStaffPush, enablePush, pushState, staffPushOn } from "@/lib/push-client";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";

type NavItem = { href: string; label: string; icon: ComponentType<IconProps> };

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: "Ажил",
    items: [
      { href: "/admin", label: "Захиалга", icon: TicketIcon },
      { href: "/admin/payments", label: "Төлбөр", icon: CardIcon },
      { href: "/admin/departures", label: "Огноо, суудал", icon: PlaneIcon },
    ],
  },
  {
    title: "Контент",
    items: [
      { href: "/admin/tours", label: "Аялал", icon: CompassIcon },
      { href: "/admin/news", label: "Мэдээ", icon: NewsIcon },
      { href: "/admin/poster", label: "Постер", icon: ImageIcon },
    ],
  },
  {
    title: "Тойм",
    items: [
      { href: "/admin/reports", label: "Тайлан", icon: ChartIcon },
      { href: "/admin/chat-logs", label: "Чат лог", icon: ChatIcon },
    ],
  },
  {
    title: "Удирдлага",
    items: [
      { href: "/admin/staff", label: "Ажилтнууд", icon: UsersIcon },
      { href: "/admin/contract", label: "Гэрээний загвар", icon: NewsIcon },
      { href: "/admin/audit", label: "Үйлдлийн бүртгэл", icon: ListIcon },
      { href: "/admin/errors", label: "Алдаа", icon: AlertIcon },
    ],
  },
];

/** Bottom tabs on phones; everything else lives in the «Цэс» sheet. */
const tabs: NavItem[] = [
  { href: "/admin", label: "Захиалга", icon: TicketIcon },
  { href: "/admin/payments", label: "Төлбөр", icon: CardIcon },
  { href: "/admin/departures", label: "Огноо", icon: PlaneIcon },
  { href: "/admin/tours", label: "Аялал", icon: CompassIcon },
];
const tabHrefs = new Set(tabs.map((t) => t.href));
const allowed = (role: Role, item: NavItem) => can(role, routePermission(item.href));

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
/** Editors are "pushed" screens with their own bottom save bar. */
const isEditor = (pathname: string) => /^\/admin\/(tours|news)\/[^/]+$/.test(pathname);

type Pulse = { newBookings: number; unread: string[]; installments: number; errors: number };

const noop = () => () => {};

/** Polls for new requests / traveller messages and raises a desktop notification when they grow. */
function usePulse() {
  const router = useRouter();
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const last = useRef<Pulse | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const p = await adminPulse().catch(() => null);
      if (!p || !alive) return;
      const prev = last.current;
      const grew = prev && (p.newBookings > prev.newBookings || p.unread.length > prev.unread.length || p.installments > prev.installments);
      if (grew && "Notification" in window && Notification.permission === "granted") {
        const installment = p.installments > prev.installments;
        const n = new Notification("Elite Travel", {
          body: installment ? "Хуваан төлөх хүсэлт ирлээ" : p.newBookings > prev.newBookings ? "Шинэ захиалгын хүсэлт ирлээ" : "Аялагч мессеж бичлээ",
          tag: "elite-admin",
        });
        n.onclick = () => {
          window.focus();
          router.push(installment ? "/admin/payments" : "/admin");
          router.refresh();
        };
      }
      last.current = p;
      setPulse(p);
    };
    void tick();
    const t = window.setInterval(tick, 30_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [router]);

  useEffect(() => {
    const n = (pulse?.newBookings ?? 0) + (pulse?.unread.length ?? 0) + (pulse?.installments ?? 0);
    document.title = n ? `(${n}) Elite Admin` : "Elite Admin";
  }, [pulse]);

  return pulse;
}

/** Browser alerts in a desktop tab; in the native app, real push to this phone. */
function useNotificationPermission() {
  const [answered, setAnswered] = useState<string | null>(null);
  const [native, setNative] = useState<string | null>(null);
  const initial = useSyncExternalStore(
    noop,
    () => ("Notification" in window ? Notification.permission : "unsupported"),
    () => "granted",
  );
  useEffect(() => {
    void pushState().then((s) => {
      if (s !== "unavailable") setNative(s === "denied" ? "denied" : s === "granted" && staffPushOn() ? "granted" : "default");
    });
  }, []);
  const permission = native ?? answered ?? initial;
  const ask = () => {
    if (native) void enablePush({ staff: true }).then((s) => setNative(s === "granted" ? "granted" : s === "denied" ? "denied" : "default"));
    else if ("Notification" in window) void Notification.requestPermission().then(setAnswered);
  };
  return { permission, ask };
}

function Badge({ n, className = "" }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <span className={`grid min-w-[1.15rem] place-items-center rounded-full bg-[#ef4444] px-1 text-[0.6rem] font-bold leading-[1.15rem] text-white ${className}`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function AdminShell({ email, role, logout, children }: { email: string; role: Role; logout: () => Promise<void>; children: ReactNode }) {
  const pathname = usePathname();
  const pulse = usePulse();
  const { permission, ask } = useNotificationPermission();
  const [more, setMore] = useState(false);
  const [moreOn, setMoreOn] = useState(pathname);
  if (moreOn !== pathname) {
    setMoreOn(pathname);
    setMore(false);
  }

  const badges: Record<string, number> = {
    "/admin": (pulse?.newBookings ?? 0) + (pulse?.unread.length ?? 0),
    "/admin/payments": pulse?.installments ?? 0,
    "/admin/errors": pulse?.errors ?? 0,
  };
  const editor = isEditor(pathname);
  const myGroups = groups.map((g) => ({ ...g, items: g.items.filter((i) => allowed(role, i)) })).filter((g) => g.items.length);
  const myTabs = tabs.filter((t) => allowed(role, t));
  const moreItems = myGroups.flatMap((g) => g.items).filter((i) => !tabHrefs.has(i.href));
  const moreActive = moreItems.some((i) => isActive(pathname, i.href));
  const moreBadge = moreItems.reduce((n, i) => n + (badges[i.href] ?? 0), 0);

  return (
    <div className="min-h-dvh bg-bg text-ink lg:grid lg:grid-cols-[256px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-[#062a2a] px-4 py-6 text-white lg:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-3 px-2">
          <Image src="/admin-icon-192.png" alt="" width={40} height={40} className="rounded-xl" />
          <span>
            <span className="block font-display text-xl font-semibold leading-none">Elite Admin</span>
            <span className="mt-1 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/45">Travel desk</span>
          </span>
        </Link>
        <nav className="flex-1 space-y-6 overflow-y-auto">
          {myGroups.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 px-3 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/35">{g.title}</p>
              <div className="space-y-0.5">
                {g.items.map((l) => {
                  const active = isActive(pathname, l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        active ? "text-[#062a2a]" : "text-white/70 hover:bg-white/[0.07] hover:text-white"
                      }`}
                    >
                      {active ? <motion.span layoutId="side-pill" className="absolute inset-0 rounded-xl bg-white" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                      <span className="relative">
                        <l.icon active={active} />
                      </span>
                      <span className="relative">{l.label}</span>
                      <Badge n={badges[l.href] ?? 0} className="relative ml-auto" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-4 space-y-1 border-t border-white/10 pt-4">
          {permission === "default" ? (
            <button type="button" onClick={ask} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#f3e0c2] hover:bg-white/[0.07]">
              <BellIcon /> Мэдэгдэл асаах
            </button>
          ) : null}
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-white/55 hover:bg-white/[0.07] hover:text-white">
            <ExternalIcon /> Сайт харах
          </a>
          <p className="truncate px-3 pt-2 text-xs text-white/40">
            {email} · {ROLE_LABEL[role]}
          </p>
          <form action={logout} onSubmit={() => void disableStaffPush()}>
            <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-white/55 hover:bg-white/[0.07] hover:text-white">
              <LogoutIcon /> Гарах
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Phone top bar */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--line)] bg-[var(--bg)]/85 px-4 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image src="/admin-icon-192.png" alt="" width={32} height={32} className="rounded-[0.6rem]" />
            <span className="font-display text-lg font-semibold">Elite Admin</span>
          </Link>
          {permission === "default" ? (
            <button type="button" onClick={ask} aria-label="Мэдэгдэл асаах" className="ml-auto grid size-9 place-items-center rounded-full bg-[#062a2a] text-[#f3e0c2]">
              <BellIcon />
            </button>
          ) : null}
        </header>

        <main className={`min-w-0 px-4 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10 ${editor ? "pb-8" : "pb-[calc(6.5rem+env(safe-area-inset-bottom))]"}`}>{children}</main>
      </div>

      {/* Phone tab bar, styled like the site's dock */}
      {!editor ? (
        <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 lg:hidden" aria-label="Админ цэс">
          <div className="mx-auto flex max-w-md items-stretch justify-between rounded-[1.5rem] border border-white/10 bg-[#062a2a]/[0.97] px-1.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            {myTabs.map((t) => {
              const active = isActive(pathname, t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.15rem] text-[0.64rem] font-medium transition active:scale-95 ${
                    active ? "text-[#7ef0e0]" : "text-white/55"
                  }`}
                >
                  {active ? <motion.span layoutId="tab-pill" className="absolute inset-[3px] rounded-[1.05rem] bg-white/10 ring-1 ring-white/15" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                  <span className="relative">
                    <t.icon active={active} />
                    <Badge n={badges[t.href] ?? 0} className="absolute -right-2.5 -top-1.5" />
                  </span>
                  <span className="relative">{t.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMore(true)}
              className={`relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.15rem] text-[0.64rem] font-medium transition active:scale-95 ${
                moreActive ? "text-[#7ef0e0]" : "text-white/55"
              }`}
            >
              {moreActive ? <span className="absolute inset-[3px] rounded-[1.05rem] bg-white/10 ring-1 ring-white/15" /> : null}
              <span className="relative">
                <GridIcon active={moreActive} />
                <Badge n={moreBadge} className="absolute -right-2.5 -top-1.5" />
              </span>
              <span className="relative">Цэс</span>
            </button>
          </div>
        </nav>
      ) : null}

      <Sheet open={more} onClose={() => setMore(false)} title="Цэс">
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {moreItems.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex flex-col gap-3 rounded-2xl border p-4 transition active:scale-[0.97] ${
                  active ? "border-accent bg-accent/[0.08] text-accent" : "border-[var(--line)] bg-white text-ink"
                }`}
              >
                <span className="flex items-center justify-between">
                  <l.icon active={active} />
                  <Badge n={badges[l.href] ?? 0} />
                </span>
                <span className="text-sm font-semibold">{l.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
          {permission === "default" ? (
            <button type="button" onClick={ask} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-ink">
              <BellIcon /> Мэдэгдэл асаах
            </button>
          ) : null}
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-ink">
            <ExternalIcon /> Сайт харах
          </a>
          <form action={logout} onSubmit={() => void disableStaffPush()}>
            <button type="submit" className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-[#c2410c]">
              <LogoutIcon /> Гарах
            </button>
          </form>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          {email} · {ROLE_LABEL[role]}
        </p>
        <p className="mt-1 text-center text-[0.7rem] text-muted">Утасны «Share → Add to Home Screen»-ээр апп болгон суулгаж болно.</p>
      </Sheet>
    </div>
  );
}
