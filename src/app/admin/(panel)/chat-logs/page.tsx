import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/trips";

const when = (iso: string) =>
  new Intl.DateTimeFormat("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

type Log = { id: number; created_at: string; question: string; answer: string; messages: { role: string; content: string }[] };

export default async function AdminChatLogsPage() {
  await requireAdmin("chatlogs.view");
  const enabled = process.env.CHAT_LOGS === "on";
  const { data } = await db().from("chat_logs").select("id, created_at, question, answer, messages").order("created_at", { ascending: false }).limit(100);
  const logs = (data ?? []) as Log[];

  return (
    <>
      <AdminTitle title="Чат лог" sub="Сайтын аяллын туслахтай хийсэн сүүлийн 100 яриа. Аялагчид юу асууж байгааг харж, аялал, үнийн мэдээллээ сайжруулахад ашиглаарай." />
      {!enabled ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Чат хадгалалт унтраалттай байна. Асаахын тулд <code className="font-mono">CHAT_LOGS=on</code> тохируулна. Хэрэглэгчийн яриа хадгалагдана — нууцлалыг бодолцоорой.
        </p>
      ) : null}
      <div className="mt-5 space-y-3">
        {logs.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Яриа алга.</p> : null}
        {logs.map((l) => (
          <details key={l.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <summary className="cursor-pointer list-none">
              <span className="text-xs text-muted">{when(l.created_at)}</span>
              <p className="mt-1 font-semibold">{l.question}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{l.answer}</p>
            </summary>
            <div className="mt-3 space-y-2 border-t border-[var(--line)] pt-3 text-sm">
              {l.messages.map((m, i) => (
                <p key={i} className="whitespace-pre-wrap">
                  <b>{m.role === "user" ? "Хэрэглэгч" : "Бот"}:</b> {m.content}
                </p>
              ))}
              <p className="whitespace-pre-wrap">
                <b>Бот:</b> {l.answer}
              </p>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
