import { Icon, type IconName } from "@/components/Icon";
import type { ReactNode } from "react";

/**
 * An empty list in the admin: what's (not) here, and — when there is one — what to do next.
 * `good` is for lists where empty is the happy state (no errors, nothing waiting).
 */
export function AdminEmpty({ icon, title, body, action, good, compact }: { icon: IconName; title: string; body?: ReactNode; action?: ReactNode; good?: boolean; compact?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-[1.4rem] border border-dashed border-[var(--line)] bg-white text-center ${compact ? "px-4 py-6" : "px-6 py-12"}`}>
      <span className={`grid size-12 place-items-center rounded-2xl ${good ? "bg-emerald-50 text-emerald-600" : "bg-accent/10 text-accent"}`} aria-hidden>
        <Icon name={good ? "badge-check" : icon} size={22} />
      </span>
      <p className="mt-3 font-display text-lg font-semibold text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
