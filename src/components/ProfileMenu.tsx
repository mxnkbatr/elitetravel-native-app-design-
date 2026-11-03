"use client";

import { Icon, type IconName } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { ThemePicker } from "@/components/ThemePicker";
import { logout, syncSaved, useAccount } from "@/lib/account";
import { haptic } from "@/lib/native";
import { onTravellerChange, savedTours, useTraveller } from "@/lib/traveller-store";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PHONE = "+97690031771";

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
  const account = useAccount();
  const { bookings, saved } = useTraveller();
  const [leaving, setLeaving] = useState(false);

  const user = account.status === "user" ? account.profile : null;
  return (
    <Sheet open={open && user != null} onClose={onClose} label="Профайл">
      {user ? (
        <div className="pt-2 text-foam">
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0d6e66] text-lg font-bold text-white">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="type-subtitle truncate">{user.name || "Сайн байна уу"}</p>
                <p className="truncate text-sm text-foam/60">{user.email}</p>
              </div>
            </div>

            <div className="mt-5 divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-bg">
              <Row href="/bookings" onClick={onClose} icon="ticket" label="Миний захиалга" aside={bookings.length ? String(bookings.length) : undefined} />
              <Row href="/bookings" onClick={onClose} icon="heart" label="Хадгалсан аялал" aside={saved.length ? String(saved.length) : undefined} />
              <Row href="/account" onClick={onClose} icon="user" label="Профайл, тохиргоо" />
              <Row href={`tel:${PHONE}`} icon="phone" label="Залгах" aside="+976 9003 1771" external />
              <Row href="https://ig.me/m/elitetravelmn" icon="mail" label="Instagram-аар бичих" external />
            </div>

            <p className="type-label mb-2 mt-5 text-muted">Өнгөний горим</p>
            <ThemePicker />

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
              className="mt-3 h-12 w-full rounded-2xl text-sm font-semibold text-[#c2410c] dark:text-[#ff8f66] disabled:opacity-60"
            >
              {leaving ? "…" : "Гарах"}
            </button>
        </div>
      ) : null}
    </Sheet>
  );
}

function Row({ href, label, icon, aside, external, onClick }: { href: string; label: string; icon: IconName; aside?: string; external?: boolean; onClick?: () => void }) {
  const content = (
    <>
      <span className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent">
        <Icon name={icon} size={17} />
      </span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      {aside ? <span className="text-xs text-foam/50">{aside}</span> : null}
      <Icon name="chevron-right" size={16} className="text-foam/30" />
    </>
  );
  const className = "flex min-h-14 items-center gap-3 px-4 py-2.5 active:bg-foam/[0.04]";
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
