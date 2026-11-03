"use client";

import { Icon } from "@/components/Icon";
import { AnimatePresence, motion } from "framer-motion";
import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Says so the moment the connection drops, instead of letting taps silently fail. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  return (
    <AnimatePresence>
      {online ? null : (
        <motion.div
          role="status"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed inset-x-0 top-[calc(0.6rem+env(safe-area-inset-top))] z-[95] flex justify-center px-4"
        >
          <p className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.3)]">
            <Icon name="wifi-off" size={17} /> Интернэт тасарлаа — холбогдмогц үргэлжилнэ
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
