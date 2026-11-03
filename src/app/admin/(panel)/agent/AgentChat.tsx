"use client";

import { confirmAction } from "@/app/admin/(panel)/feedback";
import { approveProposal, cancelProposal, removeConversation } from "@/app/admin/(panel)/agent/actions";
import { ChartIcon, ChatIcon, CompassIcon, NewsIcon, PlaneIcon, SparkIcon, TicketIcon, type IconProps } from "@/app/admin/(panel)/icons";
import { usePulse } from "@/app/admin/(panel)/pulse-context";
import { Sheet } from "@/components/Sheet";
import { formatPrice } from "@/data/tours";
import { FIELD_LABEL, isProposalTool, KIND_LABEL, PROPOSAL_PERMISSION, TOOL_LABEL, type DiffRow, type ProposalStatus, type ProposalView } from "@/lib/agent";
import { can, type Role } from "@/lib/permissions";
import { useClientValue } from "@/lib/ui";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type FormEvent, type ReactNode } from "react";

type Conversation = { id: string; title: string; updatedAt: string };

type Props = {
  conversations: Conversation[];
  initial: { id: string; messages: UIMessage[] } | null;
  statuses: Record<string, ProposalStatus>;
  role: Role;
  configured: boolean;
  /** A question handed over from the command palette, sent once on arrival */
  ask?: string;
};

const NAME = "Elite Travel Agentic AI";

/** Elite Travel Agentic AI: saved chats on the side, a ChatGPT-style conversation with tool steps and approval cards. */
export function AgentChat({ conversations: initialList, initial, statuses, role, configured, ask }: Props) {
  const [chat, setChat] = useState(() => ({ id: initial?.id ?? crypto.randomUUID(), messages: initial?.messages ?? [] }));
  const [list, setList] = useState(initialList);
  const [history, setHistory] = useState(false);

  const startNew = () => {
    setChat({ id: crypto.randomUUID(), messages: [] });
    window.history.replaceState(null, "", "/admin/agent");
    setHistory(false);
    window.scrollTo({ top: 0 });
  };
  const remember = (id: string, title: string) => {
    if (!list.some((c) => c.id === id)) {
      setList((all) => [{ id, title: title.slice(0, 60), updatedAt: new Date().toISOString() }, ...all]);
      window.history.replaceState(null, "", `/admin/agent?c=${id}`);
    }
  };

  const historyList = (
    <History
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
    // Full-bleed inside the admin shell: undo the page padding the other screens use
    <div className="-mx-4 -mb-8 -mt-5 sm:-mx-6 lg:-mx-10 lg:-mb-12 lg:-mt-8 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] flex-col border-r border-[var(--line)] bg-[var(--bg-soft)] lg:flex">{historyList}</aside>

      <div className="min-w-0">
        {configured ? (
          <ChatPane
            key={chat.id}
            id={chat.id}
            initialMessages={chat.messages}
            statuses={statuses}
            role={role}
            onSaved={remember}
            onNew={startNew}
            onHistory={() => setHistory(true)}
            ask={chat.messages.length ? undefined : ask}
          />
        ) : (
          <div className="mx-auto max-w-xl px-4 py-16 text-center">
            <AiOrb size={64} />
            <p className="mt-5 font-display text-2xl font-semibold">{NAME}</p>
            <p className="mt-3 rounded-2xl bg-[#fff4e8] p-4 text-sm text-[#b45309]">AI тохируулаагүй байна. Сервер дээр XAI_API_KEY нэмнэ үү.</p>
          </div>
        )}
      </div>

      <Sheet open={history} onClose={() => setHistory(false)} title="Ярианы түүх" tall>
        <div className="-mx-1">{historyList}</div>
      </Sheet>
    </div>
  );
}

/** The agent's mark: a teal-gold orb with a spark; it spins while the agent is working. */
export function AiOrb({ size = 32, thinking, glow }: { size?: number; thinking?: boolean; glow?: boolean }) {
  return (
    <span
      className={`ai-orb relative grid shrink-0 place-items-center rounded-full ${thinking ? "ai-orb-thinking" : ""} ${glow ? "ai-orb-glow" : ""}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="white" className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
        <path d="M12 2.5l2.2 5.6 5.8 2.2-5.8 2.2L12 18.1l-2.2-5.6L4 10.3l5.8-2.2L12 2.5Z" />
        <path d="M18.6 15.2l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9.9-2.2Z" opacity="0.85" />
      </svg>
    </span>
  );
}

const DAY = 86400_000;

function groupByDate(list: Conversation[], now: number) {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Өнөөдөр", items: [] },
    { label: "Өчигдөр", items: [] },
    { label: "Сүүлийн 7 хоног", items: [] },
    { label: "Өмнө", items: [] },
  ];
  for (const c of list) {
    const t = new Date(c.updatedAt).getTime();
    groups[t >= startOfToday ? 0 : t >= startOfToday - DAY ? 1 : t >= startOfToday - 7 * DAY ? 2 : 3].items.push(c);
  }
  return groups.filter((g) => g.items.length);
}

function History({ list, active, onNew, onDelete }: { list: Conversation[]; active: string; onNew: () => void; onDelete: (id: string) => void }) {
  const [q, setQ] = useState("");
  // Grouping by day needs the browser's clock; the server render shows one flat list
  const now = useClientValue(() => Math.floor(Date.now() / 60_000) * 60_000, 0);
  const shown = q.trim() ? list.filter((c) => c.title.toLowerCase().includes(q.trim().toLowerCase())) : list;
  const groups = now ? groupByDate(shown, now) : [{ label: "Өмнөх яриа", items: shown }];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold text-ink transition hover:border-accent/50 active:scale-[0.98]"
        >
          <PenIcon />
          Шинэ яриа
        </button>
        <label className="flex h-10 items-center gap-2 rounded-xl bg-black/[0.04] px-3 text-sm text-muted focus-within:bg-white focus-within:ring-1 focus-within:ring-accent/40">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Яриа хайх" className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted" />
        </label>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4" data-lenis-prevent>
        {shown.length === 0 ? <p className="px-3 py-2 text-sm text-muted">{q ? "Олдсонгүй." : "Яриа алга. Эхний асуултаа асуугаарай."}</p> : null}
        {groups.map((g) => (
          <div key={g.label} className="mt-3 first:mt-1">
            <p className="px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map((c) => (
                <li key={c.id} className="group relative">
                  <Link
                    href={`/admin/agent?c=${c.id}`}
                    className={`block truncate rounded-lg py-2 pl-3 pr-9 text-sm transition ${c.id === active ? "bg-accent/10 font-semibold text-accent" : "text-ink/85 hover:bg-black/[0.04]"}`}
                  >
                    {c.title}
                  </Link>
                  <button
                    type="button"
                    aria-label="Устгах"
                    onClick={async () => {
                      if (await confirmAction({ title: "Энэ яриаг устгах уу?", body: "Ярианы түүх бүрмөсөн устна.", confirm: "Устгах", danger: true })) onDelete(c.id);
                    }}
                    className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted opacity-100 hover:bg-black/[0.06] hover:text-ink lg:opacity-0 lg:group-hover:opacity-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-2.5 border-t border-[var(--line)] px-4 py-3">
        <AiOrb size={26} />
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-ink">{NAME}</span>
          <span className="block text-[0.65rem] text-muted">Grok · бодит өгөгдөл дээр</span>
        </span>
      </div>
    </div>
  );
}

const PenIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 20h8M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
  </svg>
);

type Suggestion = { icon: ComponentType<IconProps>; title: string; prompt: string };

function suggestionsFor(role: Role): Suggestion[] {
  const s: Suggestion[] = [];
  if (can(role, "bookings.view")) {
    s.push({ icon: TicketIcon, title: "Өнөөдрийн ажил", prompt: "Өнөөдөр юуг түрүүлж хийх вэ? Шинэ хүсэлт, хариулаагүй чат, дутуу баримтыг эрэмбэлж жагсаа" });
    s.push({ icon: ChatIcon, title: "Чатуудад хариу бэлдэх", prompt: "Хариулаагүй чатуудыг уншаад, тус бүрт хариу бэлд" });
  }
  if (can(role, "reports.view")) {
    s.push({ icon: ChartIcon, title: "Борлуулалтын тойм", prompt: "Энэ сарын борлуулалтыг аяллаар нь задлаад өмнөх сартай харьцуул" });
    s.push({ icon: SparkIcon, title: "Instagram, Facebook boost", prompt: "Аль аяллыг одоо Instagram, Facebook-д boost хийвэл хамгийн үр дүнтэй вэ? Хэнд, ямар төсвөөр хүргэхийг төлөвлө" });
  }
  if (can(role, "departures.manage")) s.push({ icon: PlaneIcon, title: "Суудал дуусах огноо", prompt: "Аль огноонуудад суудал дуусах гэж байна?" });
  if (can(role, "content.manage")) {
    s.push({ icon: CompassIcon, title: "Аяллын текст сайжруулах", prompt: "Бали аяллын товч тайлбарыг илүү сонирхолтой болгох санал бэлд" });
    s.push({ icon: NewsIcon, title: "Мэдээ бэлдэх", prompt: "Хамгийн ойрын аяллын тухай урамшууллын мэдээ бэлд" });
  }
  if (can(role, "chatlogs.view")) s.push({ icon: ChatIcon, title: "Зочид юу асууж байна", prompt: "Сайтын AI туслахаас зочид юу хамгийн их асууж байна, сайтад ямар мэдээлэл дутуу байна?" });
  return s.slice(0, 4);
}

function greeting(h: number) {
  if (h < 5) return "Оройн мэнд";
  if (h < 12) return "Өглөөний мэнд";
  if (h < 18) return "Өдрийн мэнд";
  return "Оройн мэнд";
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

const textOf = (m: UIMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

type ToolPart = { name: string; state: string; input: unknown; output: Record<string, unknown> | null; errorText?: string };
type Block = { kind: "text"; text: string } | { kind: "tools"; steps: ToolPart[] } | { kind: "proposal"; view: ProposalView };

/** An assistant turn as text, runs of tool steps (shown as one line) and approval cards. */
function blocksOf(m: UIMessage): Block[] {
  const out: Block[] = [];
  for (const p of m.parts) {
    if (p.type === "text") {
      if (p.text.trim()) out.push({ kind: "text", text: p.text });
      continue;
    }
    if (!isToolUIPart(p)) continue;
    const name = getToolName(p);
    const output = p.state === "output-available" ? (p.output as Record<string, unknown>) : null;
    if (output && isProposalTool(name) && typeof output.proposalId === "string") {
      out.push({ kind: "proposal", view: output as unknown as ProposalView });
      continue;
    }
    const step = { name, state: p.state, input: p.input, output, errorText: p.state === "output-error" ? p.errorText : undefined };
    const last = out[out.length - 1];
    if (last?.kind === "tools") last.steps.push(step);
    else out.push({ kind: "tools", steps: [step] });
  }
  return out;
}

const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
/** The page end, so the latest message sits just above the pinned composer. */
const toBottom = (smooth?: boolean) => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? "smooth" : "auto" });

function ChatPane({
  id,
  initialMessages,
  statuses,
  role,
  onSaved,
  onNew,
  onHistory,
  ask,
}: {
  id: string;
  initialMessages: UIMessage[];
  statuses: Record<string, ProposalStatus>;
  role: Role;
  onSaved: (id: string, title: string) => void;
  onNew: () => void;
  onHistory: () => void;
  ask?: string;
}) {
  const [input, setInput] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/admin/agent",
        // Only the new message goes up; the server keeps the history
        prepareSendMessagesRequest: ({ id: chatId, messages }) => ({ body: { id: chatId, message: messages[messages.length - 1] } }),
      }),
    [],
  );
  const { messages, sendMessage, status, error, stop, clearError } = useChat({
    id,
    messages: initialMessages,
    transport,
    onFinish: ({ messages: all }) => {
      const first = all.find((m) => m.role === "user");
      onSaved(id, first ? textOf(first) : "");
    },
  });
  const busy = status === "submitted" || status === "streaming";
  const welcome = messages.length === 0;
  // Messages loaded with the chat appear at once; only new ones animate in
  const [seen] = useState(() => new Set(initialMessages.map((m) => m.id)));

  // Follow the reply while the reader is at the bottom; leave them be when they scrolled up
  const [atBottom, setAtBottom] = useState(true);
  const follow = useRef(true);
  useEffect(() => {
    const onScroll = () => {
      const b = nearBottom();
      follow.current = b;
      setAtBottom(b);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (follow.current && messages.length) toBottom();
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
    follow.current = true;
    void sendMessage({ text: q });
  }

  const last = messages[messages.length - 1];
  const thinking = busy && (last?.role !== "assistant" || !blocksOf(last).length);

  const composer = <Composer value={input} onChange={setInput} onSend={() => send(input)} onStop={() => void stop()} busy={busy} autoFocus />;

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] flex-col lg:min-h-[calc(100dvh-4rem)]">
      {/* Top bar: history on phones, the agent's name, new chat */}
      <div className="flex items-center gap-2 px-3 pt-2 sm:px-5 lg:pt-3">
        <button type="button" onClick={onHistory} aria-label="Ярианы түүх" className="grid size-10 place-items-center rounded-xl text-ink hover:bg-black/[0.05] lg:hidden">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h10M4 17h16" />
          </svg>
        </button>
        <p className="flex min-w-0 flex-1 items-center gap-2 truncate text-[0.95rem] font-semibold text-ink">
          <span className="truncate">{NAME}</span>
          <span className="hidden shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-accent sm:inline">Grok</span>
        </p>
        {!welcome ? (
          <button type="button" onClick={onNew} aria-label="Шинэ яриа" title="Шинэ яриа" className="grid size-10 place-items-center rounded-xl text-ink hover:bg-black/[0.05]">
            <PenIcon />
          </button>
        ) : null}
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">
        {welcome ? (
          <Welcome role={role} send={send} composer={composer} />
        ) : (
          <div className="flex-1 space-y-7 pb-6 pt-6">
            {messages.map((m) =>
              m.role === "user" ? (
                <motion.div key={m.id} initial={seen.has(m.id) ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-[1.4rem] rounded-br-md bg-[#e3efeb] px-4 py-2.5 text-[0.95rem] leading-relaxed text-ink">{textOf(m)}</div>
                </motion.div>
              ) : (
                <AssistantTurn
                  key={m.id}
                  message={m}
                  animate={!seen.has(m.id)}
                  streaming={busy && m.id === last?.id}
                  statuses={statuses}
                  role={role}
                />
              ),
            )}
            {thinking ? (
              <div className="flex items-center gap-3">
                <AiOrb size={30} thinking />
                <span className="ai-shimmer text-sm font-medium">Бодож байна…</span>
              </div>
            ) : null}
            {error ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{errorText(error)}</span>
                <button type="button" onClick={clearError} className="shrink-0 font-semibold underline">
                  Хаах
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Composer pinned to the bottom (on wide screens the welcome screen holds it in the middle) */}
        <div className={`sticky bottom-0 z-10 -mx-4 bg-gradient-to-t from-[var(--bg)] from-70% to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-5 sm:-mx-6 sm:px-6 ${welcome ? "lg:hidden" : ""}`}>
          {!atBottom && !welcome ? (
            <button
              type="button"
              aria-label="Хамгийн доош"
              onClick={() => {
                follow.current = true;
                toBottom(true);
              }}
              className="absolute -top-8 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-[var(--line)] bg-white text-ink shadow-[0_8px_24px_rgba(6,42,42,0.14)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M6 13l6 6 6-6" />
              </svg>
            </button>
          ) : null}
          {composer}
          <p className="mt-2 text-center text-[0.68rem] text-muted">Elite AI алдаа гаргаж болно. Өөрчлөлт бүрийг та зөвшөөрсний дараа л хийнэ.</p>
        </div>
      </div>
    </div>
  );
}

function Welcome({ role, send, composer }: { role: Role; send: (text: string) => void; composer: ReactNode }) {
  const hello = useClientValue(() => greeting(new Date().getHours()), "Сайн байна уу");
  const { pulse } = usePulse();
  const attention = [
    pulse?.unread.length ? { n: pulse.unread.length, label: "хариулаагүй чат", prompt: "Хариулаагүй чатуудыг уншаад, тус бүрт хариу бэлд", tone: "bg-red-500" } : null,
    pulse?.stale.length ? { n: pulse.stale.length, label: "удаан хүлээсэн хүсэлт", prompt: "2-оос дээш цаг хүлээсэн шинэ хүсэлтүүдийг жагсаагаад, юу хийхийг санал болго", tone: "bg-amber-500" } : null,
    pulse?.documents.length ? { n: pulse.documents.length, label: "шалгах баримт", prompt: "Баримт шалгуулахаар хүлээж буй захиалгуудыг жагсаа", tone: "bg-sky-500" } : null,
  ].filter((x) => x != null);

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center lg:py-12">
      <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <AiOrb size={72} glow />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.5 }}
        className="mt-6 font-display text-[2.2rem] font-semibold leading-[1] tracking-[-0.035em] sm:text-[2.9rem]"
      >
        Elite Travel <span className="bg-[linear-gradient(100deg,#0e8f84,#18a89b_45%,#e8b86d)] bg-clip-text text-transparent">Agentic AI</span>
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.5 }} className="mt-3 max-w-md text-[0.95rem] text-muted">
        {hello}! Захиалга, чат, аялал, борлуулалт, boost — юуг хамтдаа хийх вэ?
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="mt-8 hidden w-full lg:block">
        {composer}
      </motion.div>

      {attention.length ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 flex flex-wrap justify-center gap-2">
          {attention.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => send(a.prompt)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3.5 py-2 text-sm text-ink transition hover:border-accent/50 active:scale-[0.97]"
            >
              <span className={`size-2 rounded-full ${a.tone}`} />
              <span className="font-semibold tabular-nums">{a.n}</span> {a.label}
            </button>
          ))}
        </motion.div>
      ) : null}

      <div className="mt-6 grid w-full gap-2.5 text-left sm:grid-cols-2">
        {suggestionsFor(role).map((s, i) => (
          <motion.button
            key={s.title}
            type="button"
            onClick={() => send(s.prompt)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.06, duration: 0.4 }}
            className="group flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_12px_30px_rgba(6,42,42,0.08)] active:scale-[0.98]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <s.icon />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{s.title}</span>
              <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">{s.prompt}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Composer({ value, onChange, onSend, onStop, busy, autoFocus }: { value: string; onChange: (v: string) => void; onSend: () => void; onStop: () => void; busy: boolean; autoFocus?: boolean }) {
  const box = useRef<HTMLTextAreaElement>(null);
  // Desktop only: on a phone, focusing would throw the keyboard over the welcome screen
  useEffect(() => {
    const el = box.current;
    if (autoFocus && el?.offsetParent && window.matchMedia("(pointer: fine)").matches) el.focus();
  }, [autoFocus]);
  // Grows with the text up to ~8 lines, then scrolls
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    onSend();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative rounded-[1.75rem] border border-[var(--line)] bg-white text-left shadow-[0_14px_44px_rgba(6,42,42,0.1)] transition focus-within:border-accent/45 focus-within:shadow-[0_14px_44px_rgba(14,143,132,0.16)]"
    >
      <textarea
        ref={box}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSend();
          }
        }}
        rows={1}
        maxLength={4000}
        placeholder="Elite AI-аас асуух эсвэл даалгавар өгөх…"
        className="block max-h-[220px] w-full resize-none bg-transparent px-5 pb-1 pt-4 text-base leading-relaxed text-ink outline-none placeholder:text-muted/80 sm:text-[0.95rem]"
      />
      <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-1">
        <span className="hidden pl-2 text-[0.7rem] text-muted sm:block">Enter — илгээх · Shift+Enter — шинэ мөр</span>
        {busy ? (
          <button type="button" onClick={onStop} aria-label="Зогсоох" title="Зогсоох" className="ml-auto grid size-9 place-items-center rounded-full bg-ink text-white transition active:scale-90">
            <span className="size-3 rounded-[3px] bg-white" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim()}
            aria-label="Илгээх"
            className="ml-auto grid size-9 place-items-center rounded-full bg-ink text-white transition active:scale-90 disabled:bg-black/10 disabled:text-muted"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}

function AssistantTurn({ message, animate, streaming, statuses, role }: { message: UIMessage; animate: boolean; streaming: boolean; statuses: Record<string, ProposalStatus>; role: Role }) {
  const blocks = blocksOf(message);
  if (!blocks.length) return null;
  const text = blocks
    .filter((b) => b.kind === "text")
    .map((b) => b.text)
    .join("\n\n");
  return (
    <motion.div initial={animate ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex gap-3.5">
      <span className="mt-0.5 hidden sm:block">
        <AiOrb size={30} thinking={streaming} />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {blocks.map((b, i) =>
          b.kind === "text" ? (
            <Rich key={i} text={b.text} />
          ) : b.kind === "tools" ? (
            <ToolSteps key={i} steps={b.steps} />
          ) : (
            <ProposalCard key={i} view={b.view} initialStatus={statuses[b.view.proposalId] ?? b.view.status} canApprove={can(role, PROPOSAL_PERMISSION[b.view.kind])} />
          ),
        )}
        {!streaming && text ? <CopyButton text={text} /> : null}
      </div>
    </motion.div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-black/[0.05] hover:text-ink"
    >
      {done ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="m5 12 5 5 9-10" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="8" y="8" width="12" height="12" rx="2.5" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
      )}
      {done ? "Хуулсан" : "Хуулах"}
    </button>
  );
}

const PATH = /\/admin(?:\/[a-z0-9/-]*)?(?:\?q=ET-[A-Z0-9]+)?|\/tours\/[a-z0-9-]+/;
// One capture group only: split() returns every group's match
const INLINE = new RegExp(`(\\*\\*[^*\\n]+\\*\\*|\`[^\`\\n]+\`|${PATH.source})`, "g");

/** **bold**, `code` and admin/tour paths as links. */
function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={i} className="rounded-md bg-black/[0.05] px-1.5 py-0.5 font-mono text-[0.85em]">{part.slice(1, -1)}</code>;
    if (/^\/(admin|tours)/.test(part)) {
      return (
        <Link key={i} href={part} className="font-semibold text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
          {part}
        </Link>
      );
    }
    return part;
  });
}

/** The agent's light formatting: paragraphs, "- " and "1. " lists, "### " headings, inline marks. */
function Rich({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let items: string[] = [];
  let ordered = false;
  const flushPara = () => {
    if (!para.length) return;
    const lines = para;
    blocks.push(
      <p key={blocks.length}>
        {lines.map((l, i) => (
          <span key={i}>
            {i ? <br /> : null}
            {inline(l)}
          </span>
        ))}
      </p>,
    );
    para = [];
  };
  const flushList = () => {
    if (!items.length) return;
    const list = items;
    blocks.push(
      ordered ? (
        <ol key={blocks.length} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-muted">
          {list.map((it, i) => (
            <li key={i} className="pl-1">
              {inline(it)}
            </li>
          ))}
        </ol>
      ) : (
        <ul key={blocks.length} className="list-disc space-y-1.5 pl-5 marker:text-accent">
          {list.map((it, i) => (
            <li key={i} className="pl-1">
              {inline(it)}
            </li>
          ))}
        </ul>
      ),
    );
    items = [];
  };

  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const num = bullet ? null : line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || num) {
      flushPara();
      if (items.length && ordered !== !!num) flushList();
      ordered = !!num;
      items.push((bullet ?? num)![1]);
      continue;
    }
    flushList();
    const head = line.match(/^#{1,6}\s+(.*)$/);
    if (head) {
      flushPara();
      blocks.push(
        <p key={blocks.length} className="pt-1 font-display text-lg font-semibold tracking-[-0.01em] text-ink">
          {inline(head[1].replace(/\*\*/g, ""))}
        </p>,
      );
    } else if (!line.trim()) flushPara();
    else para.push(line);
  }
  flushPara();
  flushList();
  return <div className="space-y-3 text-[0.95rem] leading-7 text-ink">{blocks}</div>;
}

/** A run of tool calls as one line ("✓ 3 алхам · Захиалга хайх · Чат унших"); open it for the details. */
function ToolSteps({ steps }: { steps: ToolPart[] }) {
  const [open, setOpen] = useState(false);
  const isFailed = (s: ToolPart) => s.state === "output-error" || (s.output != null && typeof s.output.error === "string");
  const running = steps.find((s) => s.state !== "output-available" && s.state !== "output-error");
  const failed = steps.filter(isFailed).length;
  const names = [...new Set(steps.map((s) => TOOL_LABEL[s.name] ?? s.name))].join(" · ");
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-muted transition hover:border-accent/40 hover:text-ink"
      >
        {running ? (
          <span className="size-3 shrink-0 animate-spin rounded-full border-2 border-accent/25 border-t-accent" />
        ) : failed ? (
          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-red-100 text-[0.6rem] font-bold text-red-700">!</span>
        ) : (
          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
              <path d="m5 12 5 5 9-10" />
            </svg>
          </span>
        )}
        <span className={`shrink-0 font-semibold ${running ? "ai-shimmer" : "text-ink"}`}>
          {running ? `${TOOL_LABEL[running.name] ?? running.name}…` : `${steps.length} алхам`}
        </span>
        {!running ? <span className="truncate">{names}</span> : null}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 transition ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div className="mt-2 space-y-1.5 border-l-2 border-accent/20 pl-3">
          {steps.map((s, i) => (
            <ToolStep key={i} step={s} failed={isFailed(s)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ToolStep({ step, failed }: { step: ToolPart; failed: boolean }) {
  const [open, setOpen] = useState(false);
  const done = step.state === "output-available";
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-soft)] text-xs">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2 text-left">
        <span className={`size-1.5 shrink-0 rounded-full ${failed ? "bg-red-500" : done ? "bg-emerald-500" : "bg-accent"}`} />
        <span className="font-semibold text-ink">{TOOL_LABEL[step.name] ?? step.name}</span>
        <span className="truncate text-muted">{failed ? String(step.output?.error ?? step.errorText ?? "алдаа") : done ? "дууслаа" : "ажиллаж байна…"}</span>
        <span className="ml-auto text-muted">{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-[var(--line)] px-3 py-2">
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all text-[0.68rem] text-muted">Оролт: {JSON.stringify(step.input, null, 2)}</pre>
          {step.output ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-[0.68rem] text-ink">{JSON.stringify(step.output, null, 2).slice(0, 6000)}</pre> : null}
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
    <div className="max-w-[min(100%,46rem)] overflow-hidden rounded-[1.4rem] border border-accent/30 bg-white shadow-[0_14px_40px_rgba(14,143,132,0.1)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[linear-gradient(100deg,rgba(14,143,132,0.08),rgba(232,184,109,0.08))] px-4 py-3">
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
