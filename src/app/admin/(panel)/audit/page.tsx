import { AdminEmpty } from "@/app/admin/(panel)/AdminEmpty";
import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/trips";
import Link from "next/link";

const ACTION_LABEL: Record<string, string> = {
  "booking.status": "Төлөв сольсон",
  "booking.amounts": "Дүн зассан",
  "booking.note": "Тэмдэглэл бичсэн",
  "payment.manual": "Төлбөр бүртгэсэн",
  "installment.sent": "Хуваан төлөх нэхэмжлэх илгээсэн",
  "installment.paid": "Хуваан төлөлт төлөгдсөн",
  "installment.cancelled": "Хуваан төлөлт цуцалсан",
  "receipt.retry": "И-баримт дахин илгээсэн",
  "provider.settings": "Хуваан төлөх тохиргоо",
  "departure.save": "Суудал тохируулсан",
  "departure.broadcast": "Бүх зорчигчид мессеж",
  "tours.create": "Аялал нэмсэн",
  "tours.update": "Аялал зассан",
  "tours.delete": "Аялал устгасан",
  "tours.reorder": "Аяллын дараалал",
  "news.create": "Мэдээ нэмсэн",
  "news.update": "Мэдээ зассан",
  "news.delete": "Мэдээ устгасан",
  "news.reorder": "Мэдээний дараалал",
  "staff.add": "Ажилтан нэмсэн",
  "staff.role": "Үүрэг сольсон",
  "staff.remove": "Ажилтан хассан",
  "error.resolve": "Алдааг шийдсэн",
  "document.approved": "Баримт зөвшөөрсөн",
  "document.rejected": "Баримт буцаасан",
  "contract.save": "Гэрээний загвар хадгалсан",
  "contract.publish": "Гэрээний загвар нийтэлсэн",
};

const when = (iso: string) =>
  new Intl.DateTimeFormat("mn-MN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

type Row = { id: number; at: string; actor: string; action: string; target_type: string | null; target_id: string | null; details: Record<string, unknown> | null };
type Access = { id: number; at: string; actor: string; booking_id: string | null; action: string };

function describe(r: Row) {
  const d = r.details ?? {};
  if (r.action === "booking.status") return `${d.from ?? "?"} → ${d.to ?? "?"}`;
  if (r.action === "staff.role") return `${d.from} → ${d.to}`;
  if (typeof d.amount === "number") return `₮${d.amount.toLocaleString("en-US").replace(/,/g, "'")}`;
  if (typeof d.recipients === "number") return `${d.recipients} захиалагч`;
  return "";
}

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin("audit.view");
  const { who, tab } = await searchParams;
  const actor = typeof who === "string" ? who : "";
  const showPassports = tab === "passports";

  let query = db().from("admin_audit").select("id, at, actor, action, target_type, target_id, details").order("at", { ascending: false }).limit(300);
  if (actor) query = query.eq("actor", actor);
  const [{ data }, { data: access }] = await Promise.all([
    showPassports ? Promise.resolve({ data: [] }) : query,
    showPassports ? db().from("passport_access_log").select("id, at, actor, booking_id, action").order("at", { ascending: false }).limit(300) : Promise.resolve({ data: [] }),
  ]);
  const rows = (data ?? []) as Row[];
  const accesses = (access ?? []) as Access[];

  return (
    <>
      <AdminTitle title="Үйлдлийн бүртгэл" sub="Хэн, хэзээ, юу өөрчилснийг харуулна. Паспортын мэдээлэл хэн харсныг тусад нь бүртгэдэг." />
      <div className="mt-5 flex gap-2">
        <Link href="/admin/audit" className={`rounded-full px-4 py-2 text-sm font-semibold ${!showPassports ? "bg-accent text-white" : "bg-white text-ink"}`}>
          Үйлдлүүд
        </Link>
        <Link href="/admin/audit?tab=passports" className={`rounded-full px-4 py-2 text-sm font-semibold ${showPassports ? "bg-accent text-white" : "bg-white text-ink"}`}>
          Паспортын хандалт
        </Link>
        {actor ? (
          <Link href="/admin/audit" className="rounded-full bg-white px-4 py-2 text-sm text-muted">
            {actor} ×
          </Link>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {showPassports ? (
          accesses.length ? (
            accesses.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white p-3.5 text-sm">
                <span className="w-24 shrink-0 text-xs text-muted">{when(a.at)}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{a.actor}</span>
                <span className="shrink-0 rounded-full bg-bg px-2.5 py-0.5 text-xs font-semibold">
                  {{ view: "Паспорт харсан", export: "Excel татсан", purge: "Хугацаа дуусч устсан", delete: "Устгасан", document: "Баримт нээсэн", care: "Эрүүл мэндийн мэдээлэл харсан" }[a.action] ?? a.action}
                </span>
                <span className="hidden shrink-0 font-mono text-xs text-muted sm:inline">{a.booking_id}</span>
              </div>
            ))
          ) : (
            <AdminEmpty icon="clock" title="Бүртгэл алга" body="Сонгосон хугацаанд үйлдэл бүртгэгдээгүй байна." />
          )
        ) : rows.length ? (
          rows.map((r) => (
            <div key={r.id} className="rounded-[1.25rem] border border-[var(--line)] bg-white p-3.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{ACTION_LABEL[r.action] ?? r.action}</span>
                <span className="text-xs text-muted">{describe(r)}</span>
                <span className="ml-auto shrink-0 text-xs text-muted">{when(r.at)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                <Link href={`/admin/audit?who=${encodeURIComponent(r.actor)}`} className="font-semibold text-accent">
                  {r.actor}
                </Link>
                {r.target_id && r.target_id !== "*" ? <span className="font-mono">{r.target_id}</span> : null}
              </div>
            </div>
          ))
        ) : (
          <AdminEmpty icon="clock" title="Бүртгэл алга" body="Сонгосон хугацаанд үйлдэл бүртгэгдээгүй байна." />
        )}
      </div>
    </>
  );
}
