/** Shown the instant a staff member switches screens, while the server prepares the data. */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Ачаалж байна">
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="admin-live-dot size-2 rounded-full bg-accent" />
        <span>Ачаалж байна…</span>
      </div>
      <div className="skeleton mt-4 h-9 w-56 rounded-lg" />
      <div className="skeleton mt-3 h-4 w-96 max-w-full rounded" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
