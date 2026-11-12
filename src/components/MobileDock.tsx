"use client";

import { haptic } from "@/lib/native";
import { scrollToY } from "@/lib/scroll";
import { useTripSummaries } from "@/lib/trip-sync";
import { useTraveller } from "@/lib/traveller-store";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/tours", label: "Аялал", icon: CompassIcon },
  { href: "/map", label: "Газрын зураг", icon: MapIcon },
  { href: "/news", label: "Мэдээ", icon: NewsIcon },
  { href: "/bookings", label: "Захиалга", icon: TicketIcon },
];

export function MobileDock() {
  const pathname = usePathname();
  const { bookings, saved } = useTraveller();
  const unread = Object.values(useTripSummaries()).reduce((n, s) => n + s.unread, 0);
  const badge = unread || bookings.length + saved.length;
  // Tour detail pages show their own booking bar instead
  if (/^\/tours\/[^/]+/.test(pathname)) return null;

  return (
    <nav
      style={{ viewTransitionName: "site-dock" }}
      className="fixed inset-x-0 bottom-0 z-[60] px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:hidden"
      aria-label="Үндсэн цэс"
    >
      {/* Rises in with CSS, so the dock is there from the first paint instead of after hydration */}
      <div
        className="enter-dock mx-auto flex max-w-sm items-center justify-between rounded-full border border-white/90 bg-white/75 px-2 py-2 shadow-[0_16px_40px_rgba(6,42,42,0.18)] backdrop-blur-2xl backdrop-saturate-150"
      >
        {items.map((item) => {
          const active =
            // The phone home is the start of the tours tab
            item.href === "/tours" ? pathname === "/" || pathname.startsWith("/tours") : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                haptic("tap");
                // Like a native tab bar: tapping the tab you are on takes you back to its top
                if (pathname === item.href) {
                  e.preventDefault();
                  scrollToY(0);
                }
              }}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`relative flex h-[3.25rem] min-w-0 flex-1 items-center justify-center rounded-full transition-colors active:scale-90 ${
                active ? "text-white" : "text-ink/70"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="dock-pill"
                  className="absolute left-1/2 top-1/2 size-[3.1rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink shadow-[0_8px_18px_rgba(6,42,42,0.35)]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              ) : null}
              <span className="relative z-10">
                <item.icon active={active} />
                <AnimatePresence>
                  {item.href === "/bookings" && badge ? (
                    <motion.span
                      key={badge}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className={`absolute -right-2.5 -top-1.5 grid min-w-4 place-items-center rounded-full px-1 text-[0.58rem] font-bold leading-4 ${unread ? "bg-[#ef4444] text-white" : "bg-[#e8b86d] text-ink"}`}
                    >
                      {badge}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


function MapIcon({ active }: { active?: boolean }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4 3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z"
        stroke="currentColor"
        strokeWidth={active ? 1.85 : 1.5}
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.18 : 0}
      />
      <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth={active ? 1.85 : 1.5} />
    </svg>
  );
}

function CompassIcon({ active }: { active?: boolean }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth={active ? 1.85 : 1.5} />
      <path
        d="m14.8 9.2-1.6 4.6-4.6 1.6 1.6-4.6 4.6-1.6Z"
        stroke="currentColor"
        strokeWidth={active ? 1.85 : 1.5}
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.2 : 0}
      />
    </svg>
  );
}



function NewsIcon({ active }: { active?: boolean }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4.5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth={active ? 1.85 : 1.5} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0} />
      <path d="M8 9h8M8 12.5h8M8 16h5" stroke="currentColor" strokeWidth={active ? 1.85 : 1.5} strokeLinecap="round" />
    </svg>
  );
}

function TicketIcon({ active }: { active?: boolean }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4V7.5Z"
        stroke="currentColor"
        strokeWidth={active ? 1.85 : 1.5}
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.18 : 0}
      />
      <path d="M14 6v12" stroke="currentColor" strokeWidth={1.5} strokeDasharray="1.5 2" />
    </svg>
  );
}
