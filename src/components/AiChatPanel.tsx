"use client";

import { useChat } from "@ai-sdk/react";
import { Icon } from "@/components/Icon";
import type { AssistantPublic } from "@/lib/assistant-settings";
import { useTours } from "@/lib/content";
import { bookingTokens, useTraveller } from "@/lib/traveller-store";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

/** Plain text: the bubble does not render markdown, so stray **bold** / # headings are dropped. */
function textOf(message: UIMessage) {
  return message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .replace(/\*\*|__|^#+\s*/gm, "")
    .replace(/^[-*] /gm, "• ");
}

/** Turns the "/tours/<id>" and "/bookings/<code>" links the assistant writes into tappable chips. */
function useLinkify() {
  const tours = useTours();
  return (text: string): ReactNode[] =>
    text.split(/(\/tours\/[a-z0-9-]+|\/bookings\/ET-[A-Z0-9]+)/g).map((part, i) => {
      const booking = part.match(/^\/bookings\/(ET-[A-Z0-9]+)$/)?.[1];
      if (booking) {
        return (
          <Link
            key={i}
            href={`/bookings/${booking}`}
            className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent hover:bg-accent hover:text-white"
          >
            {booking} захиалга →
          </Link>
        );
      }
      const id = part.match(/^\/tours\/([a-z0-9-]+)$/)?.[1];
      const tour = id ? tours.find((t) => t.id === id) : undefined;
      if (!tour) return part;
      return (
        <Link
          key={i}
          href={`/tours/${tour.id}`}
          className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent hover:bg-accent hover:text-white"
        >
          {tour.title} →
        </Link>
      );
    });
}

/**
 * The assistant's chat window, split out of AiHelper so the AI SDK loads on first open rather than
 * with every page. Stays mounted once opened, so the conversation survives closing the panel.
 */
/** The panel unfolds from the floating button below its bottom-right corner, and folds back into it. */
const FROM_BUTTON = "circle(22px at calc(100% - 30px) calc(100% + 42px))";
const OPEN = "circle(150% at calc(100% - 30px) calc(100% + 42px))";
const cascade = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.18 + i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
});

export default function AiChatPanel({ open, settings, onStarted, onClose }: { open: boolean; settings: AssistantPublic; onStarted: () => void; onClose: () => void }) {
  const suggestions = settings.suggestions;
  const [input, setInput] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  // The device's booking tokens let the assistant read only this traveller's own bookings
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat", body: () => ({ tripTokens: bookingTokens() }) }), []);
  const { messages, sendMessage, status, error, clearError } = useChat({ transport });
  const linkify = useLinkify();
  const booked = useTraveller().bookings.some((b) => b.token);
  const chips = booked ? ["Миний захиалгад юу дутуу байна?", ...suggestions.slice(0, 3)] : suggestions;

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status, open]);

  function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    clearError();
    setInput("");
    onStarted();
    void sendMessage({ text: q });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.button
          key="backdrop"
          type="button"
          aria-label="Туслахыг хаах"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[69] bg-[#031a1a]/35 backdrop-blur-[2px] sm:hidden"
        />
      ) : null}
      {open ? (
        <motion.section
          key="panel"
          role="dialog"
          aria-label="Аяллын туслах"
          initial={{ clipPath: FROM_BUTTON, opacity: 0.6 }}
          animate={{ clipPath: OPEN, opacity: 1 }}
          exit={{ clipPath: FROM_BUTTON, opacity: 0, transition: { duration: 0.35, ease: [0.65, 0, 0.35, 1] } }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-[calc(10rem+env(safe-area-inset-bottom))] top-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] z-[70] flex flex-col overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-bg-elevated shadow-[0_28px_70px_rgba(10,42,38,0.25)] sm:inset-x-auto sm:bottom-24 sm:right-6 sm:top-auto sm:h-[min(72vh,560px)] sm:w-[380px]"
        >
          <header className="relative overflow-hidden bg-[#062a2a] px-5 pb-4 pt-5 text-white">
            <div className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full bg-[#14b8a6]/30 blur-3xl" />
            <motion.div {...cascade(0)} className="relative flex items-center gap-3">
              <motion.span
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 16 }}
                className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#e8b86d] font-display text-lg font-semibold"
              >
                E
              </motion.span>
              <div>
                <p className="font-display text-lg font-semibold leading-tight">Аяллын туслах</p>
                <p className="flex items-center gap-1.5 text-xs text-white/70">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Онлайн · ихэвчлэн хэдхэн секундэд хариулна
                </p>
              </div>
            </motion.div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 text-[0.92rem]">
            <Bubble delay={0.3}>{settings.greeting}</Bubble>

            {messages.length === 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {chips.map((s, i) => (
                  <motion.button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.06, type: "spring", stiffness: 380, damping: 24 }}
                    className="min-h-9 rounded-full border border-accent/30 bg-bg px-3.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent hover:text-white"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            ) : null}

            {messages.map((m) => {
              const text = textOf(m);
              if (!text) return null;
              return m.role === "user" ? (
                <Bubble key={m.id} mine>
                  {text}
                </Bubble>
              ) : (
                <Bubble key={m.id}>{linkify(text)}</Bubble>
              );
            })}

            {status === "submitted" ? (
              <div className="flex w-16 items-center justify-center gap-1 rounded-2xl rounded-bl-md border border-[var(--line)] bg-bg px-3 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-1.5 rounded-full bg-accent"
                    animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            ) : null}

            {error ? (
              <p className="rounded-2xl bg-[#fff4e8] dark:bg-amber-400/10 px-3 py-2 text-xs text-[#b45309] dark:text-amber-200">
                Туслах түр холбогдсонгүй. Дахин оролдох эсвэл{" "}
                <a href="tel:+97690031771" className="font-semibold underline">
                  +976 9003 1771
                </a>{" "}
                руу залгаарай.
              </p>
            ) : null}
            <div ref={bottom} />
          </div>

          <form onSubmit={onSubmit} className="border-t border-[var(--line)] bg-bg-elevated p-3">
            <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-bg pl-4 pr-1.5 focus-within:border-accent">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Асуултаа бичнэ үү…"
                maxLength={1000}
                enterKeyHint="send"
                className="h-12 flex-1 bg-transparent text-base outline-none sm:text-sm"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Илгээх"
                className="grid size-10 place-items-center rounded-full bg-accent text-white transition disabled:opacity-30"
              >
                <Icon name="send" size={17} strokeWidth={2} />
              </button>
            </div>
            <p className="mt-2 text-center text-[0.7rem] text-muted">
              <a href="tel:+97690031771" className="font-semibold text-accent">
                +976 9003 1771
              </a>
              {" · "}
              <a href="https://ig.me/m/elitetravelmn" target="_blank" rel="noreferrer" className="font-semibold text-accent">
                Instagram
              </a>
            </p>
          </form>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}

/** Messages slide in from their own side with a little spring, like a phone's chat app. */
function Bubble({ mine, delay = 0, children }: { mine?: boolean; delay?: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, x: mine ? 18 : -18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 380, damping: 28 }}
      style={{ transformOrigin: mine ? "bottom right" : "bottom left" }}
      className={`w-fit max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 leading-relaxed ${
        mine ? "ml-auto rounded-br-md bg-accent text-white" : "rounded-bl-md border border-[var(--line)] bg-bg text-foam"
      }`}
    >
      {children}
    </motion.div>
  );
}
