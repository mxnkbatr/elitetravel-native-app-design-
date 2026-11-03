/** Shown while the tour list (filtered by ?dest) renders: the page's shape, shimmering. */
export default function ToursLoading() {
  return (
    <div className="page-pad-top mx-auto max-w-6xl px-4 pb-10 sm:px-6" aria-busy="true" aria-label="Аяллууд ачаалж байна">
      <div className="skeleton h-3 w-20 rounded-full" />
      <div className="skeleton mt-4 h-10 w-3/4 max-w-md rounded-2xl" />
      <div className="skeleton mt-3 h-4 w-2/3 max-w-sm rounded-full" />

      {/* Phone: chips and compact rows */}
      <div className="mt-6 flex gap-2 sm:hidden">
        {[64, 80, 72, 88].map((w) => (
          <div key={w} className="skeleton h-11 shrink-0 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-4 space-y-2.5 sm:hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-bg-elevated p-2.5">
            <div className="skeleton aspect-[4/5] w-28 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2 py-1">
              <div className="skeleton h-2.5 w-16 rounded-full" />
              <div className="skeleton h-4 w-11/12 rounded-full" />
              <div className="skeleton h-3 w-1/2 rounded-full" />
              <div className="skeleton mt-4 h-5 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Larger screens: card grid */}
      <div className="mt-8 hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-bg-elevated">
            <div className="skeleton aspect-[4/3]" />
            <div className="space-y-2.5 p-4">
              <div className="skeleton h-2.5 w-20 rounded-full" />
              <div className="skeleton h-5 w-4/5 rounded-full" />
              <div className="skeleton h-3 w-1/2 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
