"use client";

import { INTRO_HOLD_MS } from "@/components/IntroCurtain";
import { trackOnce } from "@/lib/track";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useState } from "react";

const loadPanel = () => import("@/components/AiChatPanel");
const AiChatPanel = dynamic(loadPanel, { ssr: false });

/** Floating travel assistant: answers from the live tour catalogue via /api/chat. */
export function AiHelper() {
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
        onClick={() => {
          if (!open) trackOnce("chat", "chat_open");
          setMounted(true);
          setOpen((v) => !v);
        }}
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
        {!open && !started ? (
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-[#14b8a6]/40 [animation-duration:2.4s]" />
        ) : null}
      </motion.button>

      {mounted ? <AiChatPanel open={open} onStarted={() => setStarted(true)} /> : null}
    </>
  );
}
