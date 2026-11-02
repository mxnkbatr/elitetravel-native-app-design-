/** Shown the instant a staff member switches screens, while the server prepares the data. */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Ачаалж байна">
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="size-2 animate-pulse rounded-full bg-accent" />
        <span>Ачаалж байна…</span>
      </div>
      <div className="mt-4 h-9 w-56 animate-pulse rounded-lg bg-black/[0.06]" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-black/[0.05]" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-[var(--line)] bg-white" />
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl border border-[var(--line)] bg-white" />
        ))}
      </div>
    </div>
  );
}
