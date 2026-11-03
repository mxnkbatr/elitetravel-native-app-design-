"use client";

import { Icon, type IconName } from "@/components/Icon";
import { haptic } from "@/lib/native";
import { readTheme, setTheme, subscribeTheme, type Theme } from "@/lib/theme";
import { motion } from "framer-motion";
import { useId, useSyncExternalStore } from "react";

const options: { key: Theme; label: string; icon: IconName }[] = [
  { key: "light", label: "Цайвар", icon: "sun" },
  { key: "dark", label: "Бараан", icon: "moon" },
  { key: "system", label: "Утсаар", icon: "monitor" },
];

/** Light / dark / follow the phone. Saved on this device and applied before paint on the next visit. */
export function ThemePicker({ onDark = false }: { onDark?: boolean }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as Theme);
  const pill = useId();
  return (
    <div role="radiogroup" aria-label="Өнгөний горим" className={`grid grid-cols-3 rounded-2xl p-1 ${onDark ? "bg-white/10" : "bg-[var(--skeleton)]"}`}>
      {options.map((o) => {
        const on = theme === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              haptic("tap");
              setTheme(o.key);
            }}
            className={`relative flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold ${on ? (onDark ? "text-ink" : "text-foam") : onDark ? "text-white/70" : "text-muted"}`}
          >
            {on ? <motion.span layoutId={pill} className={`absolute inset-0 rounded-xl shadow-sm ${onDark ? "bg-white" : "bg-card"}`} transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
            <span className="relative flex items-center gap-1.5">
              <Icon name={o.icon} size={15} />
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
