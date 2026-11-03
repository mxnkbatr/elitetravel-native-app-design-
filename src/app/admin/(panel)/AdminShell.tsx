"use client";

import { isActive, NAV_GROUPS, navFor, PHONE_TABS, type NavItem } from "@/app/admin/(panel)/admin-nav";
import { CommandPalette, openPalette } from "@/app/admin/(panel)/CommandPalette";
import { BellIcon, ExternalIcon, GridIcon, LogoutIcon } from "@/app/admin/(panel)/icons";
import { PulseProvider, usePulse } from "@/app/admin/(panel)/pulse-context";
import { Sheet } from "@/components/Sheet";
import { StaffFaceId } from "@/app/admin/(panel)/StaffFaceId";
import { ROLE_LABEL, type Role } from "@/lib/permissions";
import { disableStaffPush, enablePush, pushState, staffPushOn } from "@/lib/push-client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

/** Editors are "pushed" screens with their own bottom bar (save bar, the agent's message box). */
const isEditor = (pathname: string) => /^\/admin\/(tours|news)\/[^/]+$/.test(pathname) || pathname === "/admin/agent";

const noop = () => () => {};

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
    <span className={`grid min-w-[1.2rem] place-items-center rounded-full bg-[#ef4444] px-1 font-mono text-[0.62rem] font-bold leading-[1.2rem] text-white ${className}`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

function useBadges(): Record<string, number> {
  const { pulse } = usePulse();
  return {
    "/admin": (pulse?.newBookings ?? 0) + (pulse?.unread.length ?? 0),
    "/admin/payments": pulse?.installments ?? 0,
    "/admin/errors": pulse?.errors ?? 0,
    "/admin/agent": pulse?.proposals ?? 0,
  };
}

/** "● LIVE" with how long ago the panel last synced. */
function LiveStatus({ compact }: { compact?: boolean }) {
  const { syncedAt } = usePulse();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(t);
  }, []);
  const ago = syncedAt ? Math.max(0, Math.round((now - syncedAt) / 1000)) : null;
  const ok = ago != null && ago < 90;
  return (
    <span className="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted" title={ago != null ? `Сүүлд ${ago} секундын өмнө шинэчлэгдсэн` : "Холбогдож байна…"}>
      <span className={`size-2 rounded-full ${ok ? "admin-live-dot bg-accent" : "bg-amber-500"}`} />
      {compact ? null : ok ? `live · ${ago}s` : "sync…"}
    </span>
  );
}

function SearchButton({ wide }: { wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Хайх (Ctrl K)"
      className={`group flex h-10 items-center gap-2.5 rounded-xl border border-[var(--line)] bg-white text-sm text-muted transition hover:border-accent/50 hover:text-ink ${
        wide ? "w-full max-w-md px-3.5" : "w-10 justify-center"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      {wide ? (
        <>
          <span className="flex-1 text-left">Хайх эсвэл үсрэх…</span>
          <kbd className="rounded-md border border-[var(--line)] px-1.5 py-0.5 font-mono text-[0.65rem]">Ctrl K</kbd>
        </>
      ) : null}
    </button>
  );
}

function SideLink({ item, active, badge }: { item: NavItem; active: boolean; badge: number }) {
  return (
    <Link
      href={item.href}
      title={item.hint}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active ? "bg-white text-ink shadow-[0_6px_18px_rgba(0,0,0,0.18)]" : "text-white/65 hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      <item.icon active={active} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <Badge n={badge} />
    </Link>
  );
}

function Shell({ email, role, logout, children }: { email: string; role: Role; logout: () => Promise<void>; children: ReactNode }) {
  const pathname = usePathname();

  // Arriving from the public site mid-intro would leave its cover (and scroll lock) behind
  useEffect(() => {
    const html = document.documentElement;
    delete html.dataset.intro;
    delete html.dataset.heroHold;
  }, []);
  const badges = useBadges();
  const { permission, ask } = useNotificationPermission();
  const [menu, setMenu] = useState(false);
  const [menuOn, setMenuOn] = useState(pathname);
  if (menuOn !== pathname) {
    setMenuOn(pathname);
    setMenu(false);
  }

  const editor = isEditor(pathname);
  const groups = navFor(role);
  const all = groups.flatMap((g) => g.items);
  const current = all.find((i) => isActive(pathname, i.href)) ?? NAV_GROUPS.flatMap((g) => g.items).find((i) => isActive(pathname, i.href));
  const tabs = PHONE_TABS.map((href) => all.find((i) => i.href === href)).filter((i): i is NavItem => !!i);
  const rest = all.filter((i) => !PHONE_TABS.includes(i.href));
  const restActive = rest.some((i) => isActive(pathname, i.href));
  const restBadge = rest.reduce((n, i) => n + (badges[i.href] ?? 0), 0);
  const initial = email.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-dvh bg-bg text-ink lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-[#062a2a] px-3 py-5 text-white lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-3 px-2">
          <Image src="/admin-icon-192.png" alt="" width={38} height={38} className="rounded-xl" />
          <span>
            <span className="block font-display text-lg font-semibold leading-none">Elite Admin</span>
            <span className="mt-1 block text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/45">Travel desk</span>
          </span>
        </Link>
        <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="mb-1 px-3 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/35">{g.title}</p>
              <div className="space-y-0.5">
                {g.items.map((l) => (
                  <SideLink key={l.href} item={l} active={isActive(pathname, l.href)} badge={badges[l.href] ?? 0} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-4 space-y-1 border-t border-white/10 pt-4">
          {permission === "default" ? (
            <button type="button" onClick={ask} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[#f3e0c2] hover:bg-white/[0.07]">
              <BellIcon /> Мэдэгдэл асаах
            </button>
          ) : null}
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/55 hover:bg-white/[0.07] hover:text-white">
            <ExternalIcon /> Сайт харах
          </a>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold text-[#f3e0c2]">{initial}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-white/80">{email}</span>
              <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/40">{ROLE_LABEL[role]}</span>
            </span>
            <form action={logout} onSubmit={() => void disableStaffPush()}>
              <button type="submit" title="Гарах" aria-label="Гарах" className="grid size-8 place-items-center rounded-lg text-white/50 hover:bg-white/[0.07] hover:text-white">
                <LogoutIcon />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Top bar: where you are, search, live status */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--line)] bg-[var(--bg)]/85 px-4 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top))] backdrop-blur-xl sm:px-6 lg:px-10 lg:py-3">
          <Link href="/admin" className="flex items-center gap-2.5 lg:hidden">
            <Image src="/admin-icon-192.png" alt="" width={30} height={30} className="rounded-[0.6rem]" />
          </Link>
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted">
            <span className="text-accent">elite</span>
            <span className="mx-1.5">›</span>
            <span className="text-ink">{current?.label ?? "Админ"}</span>
          </p>
          <div className="hidden flex-1 justify-center md:flex">
            <SearchButton wide />
          </div>
          <div className="flex items-center gap-2">
            <LiveStatus />
            <span className="md:hidden">
              <SearchButton />
            </span>
            {permission === "default" ? (
              <button type="button" onClick={ask} aria-label="Мэдэгдэл асаах" className="grid size-10 place-items-center rounded-xl bg-[#062a2a] text-[#f3e0c2] lg:hidden">
                <BellIcon />
              </button>
            ) : null}
          </div>
        </header>

        <main className={`min-w-0 px-4 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8 ${editor ? "pb-8" : "pb-[calc(6.5rem+env(safe-area-inset-bottom))]"}`}>{children}</main>
      </div>

      {/* Phone tab bar */}
      {!editor ? (
        <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 lg:hidden" aria-label="Админ цэс">
          <div className="mx-auto flex max-w-md items-stretch justify-between rounded-[1.4rem] border border-white/10 bg-[#062a2a]/[0.97] px-1.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            {tabs.map((t) => {
              const active = isActive(pathname, t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.05rem] text-[0.64rem] font-medium transition active:scale-95 ${
                    active ? "bg-white/10 text-white ring-1 ring-white/15" : "text-white/55"
                  }`}
                >
                  <span className="relative">
                    <t.icon active={active} />
                    <Badge n={badges[t.href] ?? 0} className="absolute -right-3 -top-1.5" />
                  </span>
                  <span>{t.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMenu(true)}
              className={`relative flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.05rem] text-[0.64rem] font-medium transition active:scale-95 ${
                restActive ? "bg-white/10 text-white ring-1 ring-white/15" : "text-white/55"
              }`}
            >
              <span className="relative">
                <GridIcon active={restActive} />
                <Badge n={restBadge} className="absolute -right-3 -top-1.5" />
              </span>
              <span>Цэс</span>
            </button>
          </div>
        </nav>
      ) : null}

      <Sheet open={menu} onClose={() => setMenu(false)} title="Цэс" tall>
        <div className="space-y-4 pt-1">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 px-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted">{g.title}</p>
              <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                {g.items.map((l) => {
                  const active = isActive(pathname, l.href);
                  return (
                    <Link key={l.href} href={l.href} className={`flex items-center gap-3 border-b border-[var(--line)] px-4 py-3 last:border-0 ${active ? "text-accent" : "text-ink"}`}>
                      <l.icon active={active} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{l.label}</span>
                        <span className="block truncate text-xs text-muted">{l.hint}</span>
                      </span>
                      <Badge n={badges[l.href] ?? 0} />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
            {permission === "default" ? (
              <button type="button" onClick={ask} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-gold">
                <BellIcon /> Мэдэгдэл асаах
              </button>
            ) : null}
            <StaffFaceId />
            <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-ink">
              <ExternalIcon /> Сайт харах
            </a>
            <form action={logout} onSubmit={() => void disableStaffPush()}>
              <button type="submit" className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-[#c2410c]">
                <LogoutIcon /> Гарах
              </button>
            </form>
          </div>
          <p className="text-center font-mono text-[0.68rem] text-muted">
            {email} · {ROLE_LABEL[role]}
          </p>
        </div>
      </Sheet>

      <CommandPalette role={role} />
    </div>
  );
}

export function AdminShell(props: { email: string; role: Role; logout: () => Promise<void>; children: ReactNode }) {
  return (
    <PulseProvider>
      <Shell {...props} />
    </PulseProvider>
  );
}
