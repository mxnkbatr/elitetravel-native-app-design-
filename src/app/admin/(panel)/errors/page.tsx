import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import { ResolveError } from "@/app/admin/(panel)/errors/ResolveError";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/trips";

const when = (iso: string) =>
  new Intl.DateTimeFormat("mn-MN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

type Row = { id: number; at: string; source: "server" | "client"; message: string; path: string | null; context: { stack?: string; route?: string } | null };

async function openErrors(days: number) {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data } = await db().from("error_log").select("id, at, source, message, path, context").eq("resolved", false).gt("at", since).order("at", { ascending: false }).limit(500);
  return (data ?? []) as Row[];
}

export default async function AdminErrorsPage() {
  await requireAdmin("audit.view");
  const data = await openErrors(14);

  // Same message = same problem: group, newest first
  const groups = new Map<string, { message: string; source: Row["source"]; count: number; last: string; paths: Set<string>; sample: Row }>();
  for (const r of data) {
    const g = groups.get(r.message);
    if (g) {
      g.count++;
      if (r.path) g.paths.add(r.path);
    } else groups.set(r.message, { message: r.message, source: r.source, count: 1, last: r.at, paths: new Set(r.path ? [r.path] : []), sample: r });
  }
  const list = [...groups.values()];

  return (
    <>
      <AdminTitle title="Алдаа" sub="Сүүлийн 14 хоногт сайт, аппад гарсан алдаанууд. Ижил алдааг нэгтгэж харуулна. Засагдсаныг «Шийдсэн» гэж тэмдэглээрэй." />
      <div className="mt-5 space-y-2">
        {list.length === 0 ? <p className="rounded-[1.4rem] bg-white p-10 text-center text-sm text-muted">Алдаа алга 🎉</p> : null}
        {list.map((g) => (
          <details key={g.message} className="rounded-[1.25rem] border border-[var(--line)] bg-white p-4">
            <summary className="flex cursor-pointer list-none items-start gap-3">
              <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${g.source === "server" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                {g.source === "server" ? "Сервер" : "Хөтөч"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 break-words text-sm font-semibold">{g.message}</span>
                <span className="mt-1 block truncate text-xs text-muted">
                  {g.count}× · сүүлд {when(g.last)} · {[...g.paths].slice(0, 3).join(", ")}
                </span>
              </span>
            </summary>
            <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3">
              {g.sample.context?.route ? <p className="text-xs text-muted">Route: {g.sample.context.route}</p> : null}
              {g.sample.context?.stack ? <pre className="max-h-48 overflow-auto rounded-xl bg-bg p-3 text-[0.7rem] leading-relaxed">{g.sample.context.stack}</pre> : null}
              <ResolveError message={g.message} />
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
