"use client";

import { Icon } from "@/components/Icon";
import { INTRO_HOLD_MS } from "@/components/IntroCurtain";
import type { AssistantPublic } from "@/lib/assistant-settings";
import { trackOnce } from "@/lib/track";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const INVITE_KEY = "elite-chat-invite";

const loadPanel = () => import("@/components/AiChatPanel");
const AiChatPanel = dynamic(loadPanel, { ssr: false });

/** Floating travel assistant: answers from the live tour catalogue via /api/chat. */
export function AiHelper({ settings }: { settings: AssistantPublic }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [started, setStarted] = useState(false);

  // Following a tour link closes the panel so the page is visible
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    setOpen(false);
  }

  // A one-time nudge per session: a small bubble beside the button a few seconds after arrival
  const [invite, setInvite] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(INVITE_KEY)) return;
    } catch {
      return;
    }
    const show = window.setTimeout(() => {
      setInvite(true);
      try {
        sessionStorage.setItem(INVITE_KEY, "1");
      } catch {
        /* private mode */
      }
    }, INTRO_HOLD_MS + 5000);
    return () => window.clearTimeout(show);
  }, []);
  useEffect(() => {
    if (!invite) return;
    const hide = window.setTimeout(() => setInvite(false), 7000);
    return () => window.clearTimeout(hide);
  }, [invite]);

  function toggle() {
    if (!open) trackOnce("chat", "chat_open");
    setInvite(false);
    setMounted(true);
    setOpen((v) => !v);
  }

  // The full-screen map has its own bottom card
  if (pathname.startsWith("/map")) return null;

  return (
    <>
      <motion.button
        type="button"
        aria-label={open ? "Туслахыг хаах" : "Аяллын туслах"}
        aria-expanded={open}
        // Start fetching the chat code as soon as the visitor reaches for the button
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        onClick={toggle}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: INTRO_HOLD_MS / 1000 + 0.6, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        style={{ viewTransitionName: "site-chat" }}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-[70] grid size-14 place-items-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0d6e66] text-white shadow-[0_14px_34px_rgba(13,110,102,0.45)] sm:bottom-6 sm:right-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <Icon name="close" size={24} strokeWidth={2.2} />
            </motion.span>
          ) : (
            <motion.svg key="chat" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.4-5.1A8.5 8.5 0 1 1 21 12Z" />
              <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" strokeWidth="2.6" />
            </motion.svg>
          )}
        </AnimatePresence>
        {!open && !started ? (
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-[#14b8a6]/40 [animation-duration:2.4s]" />
        ) : null}
      </motion.button>

      <AnimatePresence>
        {invite && !open ? (
          <motion.button
            type="button"
            onClick={toggle}
            initial={{ opacity: 0, x: 16, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 340, damping: 22 }}
            style={{ transformOrigin: "right center" }}
            className="fixed bottom-[calc(6.4rem+env(safe-area-inset-bottom))] right-[4.9rem] z-[70] max-w-[min(15rem,calc(100vw-6.5rem))] rounded-2xl rounded-br-md bg-card px-4 py-2.5 text-left text-sm font-medium text-foam shadow-[0_14px_34px_rgba(6,42,42,0.2)] sm:bottom-[2.1rem] sm:right-[5.4rem]"
          >
            Аялал сонгоход туслах уу? 👋
          </motion.button>
        ) : null}
      </AnimatePresence>

      {mounted ? <AiChatPanel open={open} settings={settings} onStarted={() => setStarted(true)} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
