"use client";

import { confirmAction } from "@/app/admin/(panel)/feedback";
import { approveProposal, cancelProposal, removeConversation } from "@/app/admin/(panel)/agent/actions";
import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import { Sheet } from "@/components/Sheet";
import { formatPrice } from "@/data/tours";
import { FIELD_LABEL, isProposalTool, KIND_LABEL, PROPOSAL_PERMISSION, TOOL_LABEL, type DiffRow, type ProposalStatus, type ProposalView } from "@/lib/agent";
import { DeskIntro, type DeskContext } from "@/app/admin/(panel)/agent/DeskIntro";
import { DESK_INFO, deskHref, deskSuggestions, type Desk } from "@/lib/agent-desks";
import { can, type Role } from "@/lib/permissions";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

type Conversation = { id: string; title: string; updatedAt: string };

type Props = {
  desk: Desk;
  context: DeskContext;
  conversations: Conversation[];
  initial: { id: string; messages: UIMessage[] } | null;
  statuses: Record<string, ProposalStatus>;
  role: Role;
  configured: boolean;
  /** A question handed over from the command palette, sent once on arrival */
  ask?: string;
};

/** Admin AI agent on one desk: saved chats on the side, the conversation with live tool steps and approval cards. */
export function AgentChat({ desk, context, conversations: initialList, initial, statuses, role, configured, ask }: Props) {
  const [chat, setChat] = useState(() => ({ id: initial?.id ?? crypto.randomUUID(), messages: initial?.messages ?? [] }));
  const [list, setList] = useState(initialList);
  const [history, setHistory] = useState(false);
  const home = deskHref(desk);
  const info = DESK_INFO[desk];

  const startNew = () => {
    setChat({ id: crypto.randomUUID(), messages: [] });
    window.history.replaceState(null, "", home);
    setHistory(false);
  };
  const remember = (id: string, title: string) => {
    if (!list.some((c) => c.id === id)) {
      setList((all) => [{ id, title: title.slice(0, 60), updatedAt: new Date().toISOString() }, ...all]);
      window.history.replaceState(null, "", `${home}?c=${id}`);
    }
  };

  const historyList = (
    <History
      home={home}
      list={list}
      active={chat.id}
      onNew={startNew}
      onDelete={async (id) => {
        await removeConversation(id);
        setList((all) => all.filter((c) => c.id !== id));
        if (id === chat.id) startNew();
      }}
    />
  );

  return (
    <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <aside className="hidden lg:block">
        <div className="sticky top-10">{historyList}</div>
      </aside>

      <div className="min-w-0">
        <AdminTitle
          title={info.title}
          sub={info.sub}
          action={
            <div className="flex gap-2 lg:hidden">
              <button type="button" onClick={() => setHistory(true)} className="h-10 rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold">
                Түүх
              </button>
              <button type="button" onClick={startNew} className="h-10 rounded-full bg-accent px-4 text-sm font-semibold text-white">
                + Шинэ
              </button>
            </div>
          }
        />
        {configured ? (
          <ChatPane
            key={chat.id}
            id={chat.id}
            desk={desk}
            context={context}
            initialMessages={chat.messages}
            statuses={statuses}
            role={role}
            onSaved={remember}
            ask={chat.messages.length ? undefined : ask}
          />
        ) : (
          <p className="mt-6 rounded-2xl bg-[#fff4e8] p-4 text-sm text-[#b45309]">AI тохируулаагүй байна. Сервер дээр XAI_API_KEY нэмнэ үү.</p>
        )}
      </div>

      <Sheet open={history} onClose={() => setHistory(false)} title="Ярианы түүх" tall>
        {historyList}
      </Sheet>
    </div>
  );
}

function History({ home, list, active, onNew, onDelete }: { home: string; list: Conversation[]; active: string; onNew: () => void; onDelete: (id: string) => void }) {
  return (
    <div>
      <button type="button" onClick={onNew} className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-accent text-sm font-semibold text-white">
        + Шинэ яриа
      </button>
      <p className="mb-1.5 mt-5 px-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted">Өмнөх яриа</p>
      {list.length === 0 ? <p className="px-1 text-sm text-muted">Одоогоор алга.</p> : null}
      <ul className="space-y-0.5">
        {list.map((c) => (
          <li key={c.id} className="group flex items-center gap-1">
            <Link
              href={`${home}?c=${c.id}`}
              className={`min-w-0 flex-1 truncate rounded-xl px-3 py-2 text-sm ${c.id === active ? "bg-accent/10 font-semibold text-accent" : "text-ink hover:bg-black/[0.04]"}`}
            >
              {c.title}
            </Link>
            <button
              type="button"
              aria-label="Устгах"
              onClick={async () => {
                if (await confirmAction({ title: "Энэ яриаг устгах уу?", body: "Ярианы түүх бүрмөсөн устна.", confirm: "Устгах", danger: true })) onDelete(c.id);
              }}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted opacity-100 hover:bg-black/[0.05] lg:opacity-0 lg:group-hover:opacity-100"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Server errors arrive as JSON text ({ error }); show just the message. */
function errorText(e: Error) {
  try {
    const parsed = JSON.parse(e.message) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    // not JSON
  }
  return e.message || "Алдаа гарлаа. Дахин оролдоно уу.";
}

const plain = (s: string) => s.replace(/\*\*|__|^#+\s*/gm, "").replace(/^[-*] /gm, "• ");

function ChatPane({
  id,
  desk,
  context,
  initialMessages,
  statuses,
  role,
  onSaved,
  ask,
}: {
  id: string;
  desk: Desk;
  context: DeskContext;
  initialMessages: UIMessage[];
  statuses: Record<string, ProposalStatus>;
  role: Role;
  onSaved: (id: string, title: string) => void;
  ask?: string;
}) {
  const [input, setInput] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/admin/agent",
        // Only the new message goes up; the server keeps the history
        prepareSendMessagesRequest: ({ id: chatId, messages }) => ({ body: { id: chatId, desk, message: messages[messages.length - 1] } }),
      }),
    [desk],
  );
  const { messages, sendMessage, status, error, stop, clearError } = useChat({
    id,
    messages: initialMessages,
    transport,
    onFinish: ({ messages: all }) => {
      const first = all.find((m) => m.role === "user");
      const title = first?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";
      onSaved(id, title);
    },
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const asked = useRef(false);
  useEffect(() => {
    if (!ask || asked.current) return;
    asked.current = true;
    void sendMessage({ text: ask });
  }, [ask, sendMessage]);

  function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    clearError();
    setInput("");
    void sendMessage({ text: q });
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="mt-5 flex min-h-[calc(100dvh-13rem)] flex-col">
      <div className="flex-1 space-y-4 pb-4">
        {messages.length === 0 ? <DeskIntro context={context} send={send} /> : null}
        {messages.length === 0 ? (
          <div className="rounded-[1.4rem] border border-[var(--line)] bg-white p-5">
            <p className="text-sm text-muted">Асуух эсвэл даалгавар өгөх. Жишээ нь:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {deskSuggestions(desk, role).map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-accent/30 bg-bg px-3.5 py-2 text-left text-sm text-accent hover:bg-accent hover:text-white">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-white">
                {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
              </div>
            </div>
          ) : (
            <div key={m.id} className="space-y-2">
              {m.parts.map((p, i) => {
                if (p.type === "text" && p.text.trim()) {
                  return (
                    <div key={i} className="max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-[var(--line)] bg-white px-4 py-3 text-sm leading-relaxed text-ink">
                      {linkify(plain(p.text))}
                    </div>
                  );
                }
                if (isToolUIPart(p)) {
                  const name = getToolName(p);
                  const output = p.state === "output-available" ? (p.output as Record<string, unknown>) : null;
                  if (output && isProposalTool(name) && typeof output.proposalId === "string") {
                    const view = output as unknown as ProposalView;
                    return <ProposalCard key={i} view={view} initialStatus={statuses[view.proposalId] ?? view.status} canApprove={can(role, PROPOSAL_PERMISSION[view.kind])} />;
                  }
                  return <ToolStep key={i} name={name} state={p.state} input={p.input} output={output} errorText={p.state === "output-error" ? p.errorText : undefined} />;
                }
                return null;
              })}
            </div>
          ),
        )}

        {status === "submitted" ? <p className="text-sm text-muted">Бодож байна…</p> : null}
        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{errorText(error)}</span>
            <button type="button" onClick={clearError} className="shrink-0 font-semibold underline">
              Хаах
            </button>
          </div>
        ) : null}
        <div ref={bottom} />
      </div>

      {/* Phones: rides just above the tab bar */}
      <form
        onSubmit={onSubmit}
        className="sticky bottom-[calc(4.6rem+max(0.65rem,env(safe-area-inset-bottom)))] -mx-4 border-t border-[var(--line)] bg-[var(--bg)]/95 px-4 pb-2 pt-3 backdrop-blur-xl sm:mx-0 sm:rounded-t-2xl sm:px-0 lg:bottom-0 lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-[var(--line)] bg-white p-2 focus-within:border-accent">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={Math.min(6, Math.max(1, input.split("\n").length))}
            maxLength={4000}
            placeholder={DESK_INFO[desk].placeholder}
            className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none sm:text-sm"
          />
          {busy ? (
            <button type="button" onClick={() => void stop()} className="h-10 shrink-0 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold">
              Зогсоох
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="h-10 shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-40">
              Илгээх
            </button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[0.68rem] text-muted">AI алдаа гаргаж болно. Тоо баримтыг хэрэгслээр шалгадаг ч чухал шийдвэрийн өмнө нягтална уу.</p>
      </form>
    </div>
  );
}

/** "/admin?q=ET-…" and "/tours/…" paths become links. */
function linkify(text: string): ReactNode[] {
  return text.split(/(\/admin(?:\/[a-z0-9/-]*)?(?:\?q=ET-[A-Z0-9]+)?|\/tours\/[a-z0-9-]+)/g).map((part, i) =>
    /^\/(admin|tours)/.test(part) ? (
      <Link key={i} href={part} className="font-semibold text-accent underline underline-offset-2">
        {part}
      </Link>
    ) : (
      part
    ),
  );
}

function ToolStep({ name, state, input, output, errorText }: { name: string; state: string; input: unknown; output: Record<string, unknown> | null; errorText?: string }) {
  const [open, setOpen] = useState(false);
  const failed = state === "output-error" || (output != null && typeof output.error === "string");
  const done = state === "output-available";
  return (
    <div className="max-w-[92%] rounded-xl border border-[var(--line)] bg-bg text-xs">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2 text-left">
        <span className={`grid size-5 place-items-center rounded-full text-[0.65rem] font-bold ${failed ? "bg-red-100 text-red-700" : done ? "bg-emerald-100 text-emerald-700" : "bg-accent/10 text-accent"}`}>
          {failed ? "!" : done ? "✓" : <span className="size-2.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />}
        </span>
        <span className="font-semibold text-ink">{TOOL_LABEL[name] ?? name}</span>
        <span className="truncate text-muted">{failed ? String(output?.error ?? errorText ?? "алдаа") : done ? "дууслаа" : "ажиллаж байна…"}</span>
        <span className="ml-auto text-muted">{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-[var(--line)] px-3 py-2">
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all text-[0.68rem] text-muted">Оролт: {JSON.stringify(input, null, 2)}</pre>
          {output ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-[0.68rem] text-ink">{JSON.stringify(output, null, 2).slice(0, 6000)}</pre> : null}
        </div>
      ) : null}
    </div>
  );
}

const STATUS_TEXT: Record<ProposalStatus, { label: string; tone: string }> = {
  pending: { label: "Таны шийдвэрийг хүлээж байна", tone: "bg-amber-50 text-amber-800" },
  applied: { label: "Хадгалагдсан ✓", tone: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Цуцалсан", tone: "bg-black/[0.05] text-muted" },
  stale: { label: "Хүчингүй (мэдээлэл өөрчлөгдсөн)", tone: "bg-black/[0.05] text-muted" },
  failed: { label: "Хадгалж чадсангүй", tone: "bg-red-50 text-red-700" },
};

function ProposalCard({ view, initialStatus, canApprove }: { view: ProposalView; initialStatus: ProposalStatus; canApprove: boolean }) {
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const tone = STATUS_TEXT[status];

  async function decide(approve: boolean) {
    setBusy(true);
    setMessage(null);
    const r = approve ? await approveProposal(view.proposalId) : await cancelProposal(view.proposalId);
    setBusy(false);
    if (r.status) setStatus(r.status);
    if (!r.ok) setMessage(r.error);
  }

  return (
    <div className="max-w-[min(100%,46rem)] overflow-hidden rounded-[1.3rem] border-2 border-accent/30 bg-white shadow-[0_10px_30px_rgba(14,143,132,0.08)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-accent/[0.05] px-4 py-3">
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[0.68rem] font-bold text-white">{KIND_LABEL[view.kind]}</span>
        <span className="font-mono text-xs text-muted">{view.targetId}</span>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${tone.tone}`}>{tone.label}</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-ink">{view.summary}</p>
        <div className="mt-3 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
          {view.diff.map((d) => (
            <DiffLine key={d.field} d={d} create={view.kind === "tour.create"} />
          ))}
        </div>
        {message ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{message}</p> : null}
        {status === "applied" ? (
          <div className="mt-3 flex gap-3 text-sm">
            {appliedLinks(view).map((l) => (
              <Link key={l.href} href={l.href} target={l.external ? "_blank" : undefined} className="font-semibold text-accent underline">
                {l.label}
              </Link>
            ))}
          </div>
        ) : null}
        {status === "pending" ? (
          canApprove ? (
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={busy} onClick={() => void decide(true)} className="h-11 flex-1 rounded-xl bg-accent text-sm font-semibold text-white disabled:opacity-60 sm:flex-none sm:px-6">
                {busy ? "…" : "Зөвшөөрөх"}
              </button>
              <button type="button" disabled={busy} onClick={() => void decide(false)} className="h-11 flex-1 rounded-xl border border-[var(--line)] text-sm font-semibold disabled:opacity-60 sm:flex-none sm:px-6">
                Цуцлах
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted">Энэ төрлийн өөрчлөлтийг хийх эрхтэй ажилтан зөвшөөрнө.</p>
          )
        ) : null}
      </div>
    </div>
  );
}

/** Where to look after a proposal was applied. */
function appliedLinks(view: ProposalView): { href: string; label: string; external?: boolean }[] {
  switch (view.kind) {
    case "tour.create":
    case "tour.update":
      return [
        { href: `/tours/${view.targetId}`, label: "Сайт дээр харах", external: true },
        { href: `/admin/tours/${view.targetId}`, label: "Засварлагчид нээх" },
      ];
    case "departure.update": {
      const [tour, date] = view.targetId.split("|");
      return [{ href: `/admin/departures/${tour}${date ? `?date=${encodeURIComponent(date)}` : ""}`, label: "Огноо, суудал руу" }];
    }
    case "message.send":
      return [{ href: `/admin?q=${view.targetId}`, label: "Захиалгын чат руу" }];
    case "booking.status":
      return [{ href: `/admin?q=${view.targetId}`, label: "Захиалга руу" }];
    case "news.create":
      return [
        { href: "/news", label: "Сайт дээр харах", external: true },
        { href: `/admin/news/${view.targetId}`, label: "Засварлагчид нээх" },
      ];
  }
}

function DiffLine({ d, create }: { d: DiffRow; create: boolean }) {
  return (
    <div className="grid gap-1 px-3 py-2.5 text-xs sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
      <p className="font-semibold text-muted">{FIELD_LABEL[d.field] ?? d.field}</p>
      <div className="min-w-0 space-y-1">
        {!create ? (
          <div className="rounded-md bg-red-50/70 px-2 py-1 text-red-900 line-through decoration-red-300">
            <Value field={d.field} v={d.before} />
          </div>
        ) : null}
        <div className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-900">
          <Value field={d.field} v={d.after} />
        </div>
      </div>
    </div>
  );
}

function Value({ field, v }: { field: string; v: unknown }) {
  if (v == null || v === "") return <span className="text-muted">{field === "capacity" ? "Хязгааргүй" : "—"}</span>;
  if (typeof v === "boolean") return <span>{field === "closed" ? (v ? "Хаасан" : "Нээлттэй") : v ? "Тийм" : "Үгүй"}</span>;
  if (typeof v === "number") return <span>{field === "price" || field === "oldPrice" ? formatPrice(v) : v}</span>;
  if (typeof v === "string") return <Clamp text={v} />;
  if (Array.isArray(v)) {
    return (
      <ul className="list-disc space-y-0.5 pl-4">
        {v.map((x, i) => (
          <li key={i}>{typeof x === "string" ? x : typeof x === "object" && x && "title" in x ? `${(x as { day?: string }).day ?? ""} — ${(x as { title: string }).title}` : JSON.stringify(x)}</li>
        ))}
      </ul>
    );
  }
  if (typeof v === "object") {
    return (
      <span>
        {Object.entries(v as Record<string, unknown>)
          .map(([k, x]) => `${k}: ${typeof x === "number" && k !== "depositPercent" ? formatPrice(x) : String(x)}`)
          .join(" · ")}
      </span>
    );
  }
  return <span>{String(v)}</span>;
}

function Clamp({ text }: { text: string }) {
  const [all, setAll] = useState(false);
  if (text.length <= 280) return <span className="whitespace-pre-wrap">{text}</span>;
  return (
    <span className="whitespace-pre-wrap">
      {all ? text : `${text.slice(0, 280)}…`}{" "}
      <button type="button" onClick={() => setAll((x) => !x)} className="font-semibold underline">
        {all ? "хураах" : "бүгдийг"}
      </button>
    </span>
  );
}
