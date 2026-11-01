"use client";

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
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 sm:hidden"
      aria-label="Үндсэн цэс"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex max-w-md items-stretch justify-between rounded-[1.5rem] border border-white/10 bg-[#062a2a]/[0.97] backdrop-blur-xl sm:bg-[#062a2a]/92 px-1.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
      >
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.15rem] text-[0.66rem] font-medium tracking-[0.02em] transition active:scale-95 ${
                active ? "text-[#7ef0e0]" : "text-white/55"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="dock-pill"
                  className="absolute inset-[3px] rounded-[1.05rem] bg-white/10 ring-1 ring-white/15"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
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
              <span className="relative z-10 max-w-full truncate px-0.5">{item.label}</span>
            </Link>
          );
        })}
      </motion.div>
    </nav>
  );
}


function MapIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4.5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth={active ? 1.85 : 1.5} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0} />
      <path d="M8 9h8M8 12.5h8M8 16h5" stroke="currentColor" strokeWidth={active ? 1.85 : 1.5} strokeLinecap="round" />
    </svg>
  );
}

function TicketIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
