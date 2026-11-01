import type { ReactNode } from "react";

/** iOS-style large title used at the top of every admin screen. */
export function AdminTitle({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-display text-[2.1rem] font-semibold leading-[1] tracking-[-0.035em] sm:text-[2.5rem]">{title}</h1>
        {sub ? <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">{sub}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Primary pill action next to a title (e.g. «+ Шинэ аялал»). */
export const titleActionClass =
  "inline-flex h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,143,132,0.25)] transition hover:bg-accent-soft active:scale-[0.97]";
