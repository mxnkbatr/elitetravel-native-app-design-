"use client";

import { Icon } from "@/components/Icon";
import { haptic } from "@/lib/native";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const noop = () => () => {};

/**
 * iOS-style bottom sheet on phones, centred dialog on larger screens. Drag down or tap the
 * backdrop to close. Portalled to <body> so fixed bars never cover it.
 */
export function Sheet({
  open,
  onClose,
  title,
  label,
  children,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Accessible name when the title is not plain text */
  label?: string;
  children: ReactNode;
  /** Near full height (chat, long forms) */
  tall?: boolean;
}) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const controls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Хаах" onClick={onClose} className="absolute inset-0 bg-[#062a2a]/45 backdrop-blur-[2px]" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label ?? (typeof title === "string" ? title : undefined)}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
            drag="y"
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragListener={false}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) {
                haptic("tap");
                onClose();
              }
            }}
            className={`relative flex w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-[var(--bg-soft)] shadow-[0_-20px_60px_rgba(0,0,0,0.22)] sm:max-w-lg sm:rounded-[1.75rem] ${
              tall ? "h-[92dvh] sm:h-[min(80vh,720px)]" : "max-h-[90dvh]"
            }`}
          >
            {/* Dragging starts only from the header, so the content below can scroll */}
            <div className="shrink-0 cursor-grab touch-none px-5 pb-2 pt-2.5 active:cursor-grabbing" onPointerDown={(e) => controls.start(e)}>
              <div className="mx-auto h-1.5 w-10 rounded-full bg-[var(--line)] sm:hidden" />
              {title ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 font-display text-xl font-semibold text-foam">{title}</div>
                  <button type="button" onClick={onClose} aria-label="Хаах" className="tap grid size-9 shrink-0 place-items-center rounded-full bg-[var(--skeleton)] text-muted">
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ) : null}
            </div>
            <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
