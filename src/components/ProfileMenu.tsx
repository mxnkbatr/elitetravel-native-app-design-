"use client";

import { logout, syncSaved, useAccount } from "@/lib/account";
import { haptic } from "@/lib/native";
import { onTravellerChange, savedTours, useTraveller } from "@/lib/traveller-store";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const PHONE = "+97690031771";
const noop = () => () => {};

/** Header avatar: guests go straight to the sign-in screen; a signed-in traveller gets the shortcuts sheet. */
export function ProfileButton({ onDark }: { onDark: boolean }) {
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [openOn, setOpenOn] = useState(pathname);
  if (openOn !== pathname) {
    setOpenOn(pathname);
    setOpen(false);
  }

  // Saved tours follow a signed-in traveller to their other devices
  useEffect(() => {
    let last = savedTours().join();
    return onTravellerChange(() => {
      const now = savedTours().join();
      if (now === last) return;
      last = now;
      void syncSaved();
    });
  }, []);

  const initial = account.profile ? (account.profile.name || account.profile.email).trim().charAt(0).toUpperCase() : null;
  return (
    <>
      <button
        type="button"
        aria-label={account.status === "user" ? "Миний профайл" : "Нэвтрэх, бүртгүүлэх"}
        onClick={() => {
          haptic("tap");
          if (account.status === "user") setOpen(true);
          else router.push("/account?mode=login");
        }}
        className={`grid size-10 place-items-center rounded-full transition active:scale-90 ${onDark ? "text-white hover:bg-white/10" : "text-foam hover:bg-ink/[0.06]"}`}
      >
        {initial ? (
          <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0d6e66] text-sm font-bold text-white">{initial}</span>
        ) : (
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="8.5" r="3.75" stroke="currentColor" strokeWidth="1.7" />
            <path d="M4.75 19.5c1.2-3.3 4-5 7.25-5s6.05 1.7 7.25 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <ProfileSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const account = useAccount();
  const { bookings, saved } = useTraveller();
  const [leaving, setLeaving] = useState(false);
  if (!mounted) return null;

  const user = account.status === "user" ? account.profile : null;
  return createPortal(
    <AnimatePresence>
      {open && user ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" role="dialog" aria-label="Профайл">
          <motion.button
            type="button"
            aria-label="Хаах"
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-md rounded-t-[1.8rem] bg-bg-elevated px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 text-foam shadow-2xl sm:rounded-[1.8rem]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 500) onClose();
            }}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-foam/15 sm:hidden" />

            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0d6e66] text-lg font-bold text-white">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-semibold">{user.name || "Сайн байна уу 👋"}</p>
                <p className="truncate text-sm text-foam/60">{user.email}</p>
              </div>
            </div>

            <div className="mt-5 divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-bg">
              <Row href="/bookings" onClick={onClose} icon="🎫" label="Миний захиалга" aside={bookings.length ? String(bookings.length) : undefined} />
              <Row href="/bookings" onClick={onClose} icon="♡" label="Хадгалсан аялал" aside={saved.length ? String(saved.length) : undefined} />
              <Row href="/account" onClick={onClose} icon="👤" label="Профайл, тохиргоо" />
              <Row href={`tel:${PHONE}`} icon="☏" label="Залгах" aside="+976 9003 1771" external />
              <Row href="https://ig.me/m/elitetravelmn" icon="✉" label="Instagram-аар бичих" external />
            </div>

            <button
              type="button"
              disabled={leaving}
              onClick={() => {
                setLeaving(true);
                void logout().finally(() => {
                  setLeaving(false);
                  onClose();
                });
              }}
              className="mt-3 h-12 w-full rounded-2xl text-sm font-semibold text-[#c2410c] disabled:opacity-60"
            >
              {leaving ? "…" : "Гарах"}
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function Row({ href, label, icon, aside, external, onClick }: { href: string; label: string; icon: ReactNode; aside?: string; external?: boolean; onClick?: () => void }) {
  const content = (
    <>
      <span className="grid size-8 place-items-center rounded-xl bg-accent/10 text-sm text-accent">{icon}</span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      {aside ? <span className="text-xs text-foam/50">{aside}</span> : null}
      <span className="text-foam/30">›</span>
    </>
  );
  const className = "flex items-center gap-3 px-4 py-3 active:bg-foam/[0.04]";
  return external ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <Link href={href} onClick={onClick} className={className}>
      {content}
    </Link>
  );
}
