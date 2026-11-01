"use client";

import { useChat } from "@ai-sdk/react";
import { INTRO_HOLD_MS } from "@/components/IntroCurtain";
import { useTours } from "@/lib/content";
import { bookingTokens, useTraveller } from "@/lib/traveller-store";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

const suggestions = [
  "Хамгийн ойрын аялал?",
  "Бали аяллын үнэ?",
  "2 хүн Хайнань явахад урьдчилгаа хэд вэ?",
  "Хайнань аялалд юу багтсан бэ?",
  "Хуваан төлөх боломжтой юу?",
];

function textOf(message: UIMessage) {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
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

/** Floating travel assistant: answers from the live tour catalogue via /api/chat. */
export function AiHelper() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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

  // Following a tour link closes the panel so the page is visible
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    setOpen(false);
  }

  // The full-screen map has its own bottom card
  if (pathname.startsWith("/map")) return null;

  function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    clearError();
    setInput("");
    void sendMessage({ text: q });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <>
      <motion.button
        type="button"
        aria-label={open ? "Туслахыг хаах" : "Аяллын туслах"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: INTRO_HOLD_MS / 1000 + 0.6, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-[70] grid size-14 place-items-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0d6e66] text-white shadow-[0_14px_34px_rgba(13,110,102,0.45)] sm:bottom-6 sm:right-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} className="text-2xl leading-none">
              ×
            </motion.span>
          ) : (
            <motion.svg key="chat" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.4-5.1A8.5 8.5 0 1 1 21 12Z" />
              <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" strokeWidth="2.6" />
            </motion.svg>
          )}
        </AnimatePresence>
        {!open && messages.length === 0 ? (
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-[#14b8a6]/40 [animation-duration:2.4s]" />
        ) : null}
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.section
            role="dialog"
            aria-label="Аяллын туслах"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed inset-x-3 bottom-[calc(10rem+env(safe-area-inset-bottom))] top-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] z-[70] flex flex-col overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-bg-elevated shadow-[0_28px_70px_rgba(10,42,38,0.25)] sm:inset-x-auto sm:bottom-24 sm:right-6 sm:top-auto sm:h-[min(72vh,560px)] sm:w-[380px]"
          >
            <header className="relative overflow-hidden bg-[#062a2a] px-5 pb-4 pt-5 text-white">
              <div className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full bg-[#14b8a6]/30 blur-3xl" />
              <div className="relative flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#e8b86d] font-display text-lg font-semibold">E</span>
                <div>
                  <p className="font-display text-lg font-semibold leading-tight">Аяллын туслах</p>
                  <p className="flex items-center gap-1.5 text-xs text-white/70">
                    <span className="size-1.5 rounded-full bg-emerald-400" /> Онлайн · ихэвчлэн хэдхэн секундэд хариулна
                  </p>
                </div>
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 text-[0.92rem]">
              <Bubble>Сайн байна уу! 👋 Аялал, үнэ, огнооны талаар асуугаарай — тохирох аяллыг санал болгоё.</Bubble>

              {messages.length === 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {chips.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="rounded-full border border-accent/30 bg-bg px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent hover:text-white"
                    >
                      {s}
                    </button>
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
                <p className="rounded-2xl bg-[#fff4e8] px-3 py-2 text-xs text-[#b45309]">
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
                  className="grid size-9 place-items-center rounded-full bg-accent text-white transition disabled:opacity-30"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
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
    </>
  );
}

function Bubble({ mine, children }: { mine?: boolean; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`w-fit max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 leading-relaxed ${
        mine ? "ml-auto rounded-br-md bg-accent text-white" : "rounded-bl-md border border-[var(--line)] bg-bg text-foam"
      }`}
    >
      {children}
    </motion.div>
  );
}
