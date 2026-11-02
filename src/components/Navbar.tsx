"use client";

import { EliteLogo } from "@/components/EliteLogo";
import { MegaMenu } from "@/components/MegaMenu";
import { ProfileButton } from "@/components/ProfileMenu";
import { openSearch } from "@/components/SearchOverlay";
import { useTraveller } from "@/lib/traveller-store";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const links = [
  { href: "/tours", label: "Аяллууд" },
  { href: "/map", label: "Газрын зураг" },
  { href: "/resorts", label: "Буудал" },
  { href: "/news", label: "Мэдээ" },
  { href: "/about", label: "Бидний тухай" },
];

const PHONE = "+97690031771";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Floating glass capsule. Desktop: shrinks into a compact pill once you scroll and
 * opens a destinations mega menu from "Аяллууд". Phone: tucks away on scroll down.
 */
export function Navbar() {
  const pathname = usePathname();
  const { bookings, saved } = useTraveller();
  const tripCount = bookings.length + saved.length;
  const { scrollY } = useScroll();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const [mega, setMega] = useState(false);
  const megaTimer = useRef(0);

  const openMega = () => {
    window.clearTimeout(megaTimer.current);
    setMega(true);
  };
  const closeMegaSoon = () => {
    window.clearTimeout(megaTimer.current);
    megaTimer.current = window.setTimeout(() => setMega(false), 160);
  };

  const [isPhone, setIsPhone] = useState(false);
  /**
   * First-visit "Dynamic Island" entrance: wait (hidden under the intro / hero reveal) →
   * dot (E mark pops in, top centre) → open (stretches into the full capsule, contents
   * cascade in) → null (ordinary header).
   */
  const [island, setIsland] = useState<"wait" | "dot" | "open" | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const holding = () => html.dataset.intro === "1" || html.dataset.heroHold === "1";
    if (!holding()) return;
    const timers: number[] = [];
    const sync = () => {
      // Still covered by the intro curtain / hero hold: sit hidden as a dot-to-be
      if (holding()) {
        setIsland("wait");
        return;
      }
      observer.disconnect();
      setIsland("dot");
      timers.push(window.setTimeout(() => setIsland("open"), 420));
      timers.push(window.setTimeout(() => setIsland(null), 1700));
    };
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["data-intro", "data-hero-hold"] });
    // First tick happens under the curtain; pages without the hero only follow the intro
    timers.push(window.setTimeout(sync, 0));
    // Safety net: whatever happens to the intro, the header is never held back for long
    timers.push(
      window.setTimeout(() => {
        delete html.dataset.heroHold;
        delete html.dataset.intro;
      }, 6500),
    );
    return () => {
      observer.disconnect();
      timers.forEach(window.clearTimeout);
    };
  }, []);
  const asDot = island === "wait" || island === "dot";

  // Navigating closes the menus
  const [menusFor, setMenusFor] = useState(pathname);
  if (menusFor !== pathname) {
    setMenusFor(pathname);
    setOpen(false);
    setMega(false);
  }
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    setCompact(!isPhone && y > 120);
    setHidden(isPhone && y > 160 && y > prev + 4);
    if (y < prev - 4) setHidden(false);
    if (Math.abs(y - prev) > 40) setMega(false);
  });

  // Light-on-dark over the home hero and over the open menu sheet
  const onDark = (pathname === "/" && !scrolled && !isPhone) || open;
  const pill = hover ?? links.find((l) => isActive(pathname, l.href))?.href ?? null;

  return (
    <>
      <motion.header
        animate={{ y: hidden && !open ? "-130%" : "0%" }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        style={{ viewTransitionName: "site-header" }}
        className={`fixed inset-x-0 top-0 z-[65] px-3 pt-[calc(0.6rem+env(safe-area-inset-top,0px))] sm:px-5 ${
          pathname === "/map" ? "max-sm:hidden" : ""
        }`}
      >
        <motion.div
          initial={false}
          data-island={island ?? undefined}
          animate={
            asDot
              ? { maxWidth: 56, height: 56, opacity: island === "dot" ? 1 : 0, scale: island === "dot" ? 1 : 0.4 }
              : { maxWidth: compact ? 880 : 1152, height: compact ? 52 : 57.6, opacity: 1, scale: 1 }
          }
          transition={
            island === "dot"
              ? { type: "spring", stiffness: 520, damping: 22 }
              : island === "open"
                ? { maxWidth: { type: "spring", stiffness: 140, damping: 20, mass: 0.9 }, default: { type: "spring", stiffness: 260, damping: 30 } }
                : { type: "spring", stiffness: 260, damping: 32 }
          }
          className={`mx-auto flex items-center gap-3 overflow-hidden rounded-full border transition-[background-color,border-color,box-shadow] duration-500 ${
            asDot ? "justify-center px-0" : "justify-between pl-4 pr-2 sm:pl-5"
          } ${
            onDark
              ? "border-white/15 bg-white/[0.07] backdrop-blur-md"
              : "border-[var(--line)] bg-bg-elevated/95 shadow-[0_10px_40px_rgba(6,42,42,0.10)] backdrop-blur-xl sm:bg-bg-elevated/85"
          }`}
        >
          <EliteLogo size="sm" light={onDark} showWordmark={!compact && !asDot} />

          <nav
            className="hidden items-center lg:flex"
            onMouseLeave={() => {
              setHover(null);
              closeMegaSoon();
            }}
          >
            {links.map((l, i) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{ "--i": i } as React.CSSProperties}
                  onMouseEnter={() => {
                    setHover(l.href);
                    if (l.href === "/tours") openMega();
                    else closeMegaSoon();
                  }}
                  aria-expanded={l.href === "/tours" ? mega : undefined}
                  className={`relative flex items-center gap-1 rounded-full py-2 font-medium transition-all ${compact ? "px-3 text-[0.8rem]" : "px-4 text-[0.84rem]"} ${
                    onDark
                      ? active || hover === l.href
                        ? "text-white"
                        : "text-white/70"
                      : active || hover === l.href
                        ? "text-foam"
                        : "text-foam/60"
                  }`}
                >
                  {pill === l.href ? (
                    <motion.span
                      layoutId="nav-pill"
                      className={`absolute inset-0 rounded-full ${onDark ? "bg-white/15" : "bg-ink/[0.06]"}`}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <span className="relative">{l.label}</span>
                  {l.href === "/tours" ? (
                    <motion.svg animate={{ rotate: mega ? 180 : 0 }} width="10" height="10" viewBox="0 0 10 10" className="relative opacity-60" aria-hidden>
                      <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </motion.svg>
                  ) : null}
                  {active ? (
                    <motion.span
                      layoutId="nav-dot"
                      className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#e8b86d]"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Хайх"
              className={`grid size-10 place-items-center rounded-full transition active:scale-90 ${
                onDark ? "text-white hover:bg-white/10" : "text-foam hover:bg-ink/[0.06]"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
                <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
            <ProfileButton onDark={onDark} />

            <Link
              href="/bookings"
              className={`btn-shine hidden h-10 items-center gap-2 rounded-full pr-1.5 text-[0.8rem] font-semibold transition hover:-translate-y-0.5 sm:inline-flex ${compact ? "pl-1.5" : "pl-4"} ${
                onDark ? "bg-white text-ink" : "bg-ink text-white"
              }`}
            >
              <span className={compact ? "sr-only" : ""}>Миний захиалга</span>
              <motion.span
                key={tripCount}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                className={`grid size-7 place-items-center rounded-full text-[0.7rem] font-bold ${
                  tripCount ? "bg-[#e8b86d] text-ink" : onDark ? "bg-ink/10" : "bg-white/15"
                }`}
              >
                {tripCount || "→"}
              </motion.span>
            </Link>

            <button
              type="button"
              aria-label={open ? "Цэс хаах" : "Цэс нээх"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`relative grid size-10 place-items-center rounded-full transition active:scale-90 lg:hidden ${
                open ? "bg-ink text-white" : onDark ? "bg-white/10 text-white" : "bg-ink/[0.06] text-foam"
              }`}
            >
              <span className="relative block h-3 w-4">
                <motion.span
                  className="absolute left-0 top-0 h-[1.5px] w-full rounded-full bg-current"
                  animate={open ? { top: "50%", rotate: 45 } : { top: "0%", rotate: 0 }}
                />
                <motion.span
                  className="absolute bottom-0 left-0 h-[1.5px] w-full rounded-full bg-current"
                  animate={open ? { bottom: "45%", rotate: -45 } : { bottom: "0%", rotate: 0 }}
                />
              </span>
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {mega ? (
            <motion.div
              key="mega"
              onMouseEnter={openMega}
              onMouseLeave={closeMegaSoon}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="absolute left-1/2 top-full mt-2 hidden w-[min(68rem,calc(100vw-2.5rem))] -translate-x-1/2 origin-top overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-bg-elevated/95 text-foam shadow-[0_30px_80px_rgba(6,42,42,0.18)] backdrop-blur-xl lg:block"
            >
              <MegaMenu onNavigate={() => setMega(false)} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.header>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[62] flex flex-col bg-[#062a2a] px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(6rem+env(safe-area-inset-top))] text-white lg:hidden"
            initial={{ clipPath: "circle(0% at calc(100% - 2.5rem) 2.6rem)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 2.5rem) 2.6rem)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 2.5rem) 2.6rem)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgba(232,184,109,0.18),transparent_50%),radial-gradient(ellipse_at_0%_100%,rgba(46,196,182,0.2),transparent_50%)]" />
            <nav className="relative flex flex-col">
              {[...links, { href: "/bookings", label: "Миний захиалга" }].map((l, i) => {
                const active = isActive(pathname, l.href);
                return (
                  <motion.div
                    key={l.href}
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex items-baseline justify-between border-b border-white/10 py-3.5"
                    >
                      <span className={`font-display text-[2.1rem] font-semibold leading-none tracking-[-0.03em] ${active ? "italic text-[#e8b86d]" : ""}`}>
                        {l.label}
                      </span>
                      <span className="text-xs text-white/40">0{i + 1}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            <motion.div
              className="relative mt-auto grid grid-cols-2 gap-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <a href={`tel:${PHONE}`} className="flex h-12 items-center justify-center rounded-full bg-[#e8b86d] text-sm font-semibold text-ink">
                Залгах
              </a>
              <a
                href="https://ig.me/m/elitetravelmn"
                target="_blank"
                rel="noreferrer"
                className="flex h-12 items-center justify-center rounded-full border border-white/25 text-sm font-semibold"
              >
                Instagram
              </a>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
