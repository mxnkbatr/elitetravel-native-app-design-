"use client";

import { Icon, type IconName } from "@/components/Icon";
import { motion } from "framer-motion";
import Link from "next/link";

/**
 * Friendly "nothing here yet" panel: a floating icon over a soft glow, a line of encouragement
 * and one clear next step — never a bare "no data".
 */
export function EmptyState({ icon, title, body, href, cta }: { icon: IconName; title: string; body: string; href: string; cta: string }) {
  return (
    <div className="relative grid place-items-center overflow-hidden rounded-[1.6rem] border border-dashed border-[var(--line)] bg-bg-elevated px-6 py-12 text-center">
      <div className="pointer-events-none absolute -top-16 left-1/2 size-56 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--accent-mist),transparent_70%)]" aria-hidden />
      <motion.div
        animate={{ y: [0, -6, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        className="relative grid size-16 place-items-center rounded-[1.4rem] bg-gradient-to-br from-accent to-[#0b6f66] text-white shadow-[0_14px_30px_rgba(14,143,132,0.35)]"
        aria-hidden
      >
        <Icon name={icon} size={28} />
        <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-[#e8b86d] text-ink">
          <Icon name="sparkle" size={13} strokeWidth={2} />
        </span>
      </motion.div>
      <p className="type-subtitle relative mt-5">{title}</p>
      <p className="relative mt-1.5 max-w-xs text-sm text-muted">{body}</p>
      <Link href={href} className="relative mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-white">
        {cta} <Icon name="arrow-right" size={16} />
      </Link>
    </div>
  );
}
