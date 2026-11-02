"use client";

import { cldImage } from "@/lib/cloudinary";
import { haptic } from "@/lib/native";
import { enablePush, pushState, type PushState } from "@/lib/push-client";
import { useClientValue } from "@/lib/ui";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

const SEEN = "elite-onboarded";

/** Hand-picked full-resolution photos (several tour gallery images are only ~700 px wide). */
const slides = [
  {
    key: "explore",
    photo: "elitetravel/tours/tropical-aerial-coast",
    eyebrow: "Elite Travel",
    title: "Мөрөөдлийн аяллаа олоорой",
    text: "Хайнань, Бали, Хонг Конг, концерт аяллууд — нислэг, буудал, хөтөчтэй бүрэн багцаар.",
  },
  {
    key: "book",
    photo: "elitetravel/tours/atlantis-waterpark",
    eyebrow: "Захиалга",
    title: "Захиалга, төлбөр нэг дор",
    text: "Хэдхэн товшилтоор захиалж, QPay эсвэл Pocket, Toki, Simple, Dari-аар хуваан төлнө. И-баримт автоматаар.",
  },
  {
    key: "docs",
    photo: "elitetravel/tours/day2-baishilin-glass-bridge",
    eyebrow: "Бичиг баримт",
    title: "Бүх зүйл утсан дээрээ",
    text: "Паспортоо камераар уншуулж, визийн зургаа шалгуулж, гэрээндээ хуруугаараа гарын үсэг зурна.",
  },
  {
    key: "notify",
    photo: "elitetravel/media/web-hero-seascape-frame",
    eyebrow: "Мэдэгдэл",
    title: "Юуг ч бүү алдаарай",
    text: "Манай багийн хариу, төлбөрийн баталгаа, аяллын өмнөх сануулгыг утсандаа шууд аваарай.",
  },
] as const;

/** First launch of the native app only: four swipeable intro screens, ending with the push prompt. */
export function AppOnboarding() {
  const app = useClientValue(() => document.documentElement.dataset.app === "1", false);
  const seen = useClientValue(() => {
    try {
      return localStorage.getItem(SEEN) === "1";
    } catch {
      return true;
    }
  }, true);
  const [closed, setClosed] = useState(false);
  if (!app || seen || closed) return null;
  return (
    <Slides
      onDone={() => {
        try {
          localStorage.setItem(SEEN, "1");
        } catch {
          // Private storage: it may show again next launch, harmless
        }
        setClosed(true);
      }}
    />
  );
}

function Slides({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [push, setPush] = useState<PushState>("unavailable");
  const [busy, setBusy] = useState(false);
  const slide = slides[index];
  const last = index === slides.length - 1;
  const image = cldImage(slide.photo);

  useEffect(() => {
    void pushState().then(setPush);
  }, []);

  function go(step: number) {
    const next = index + step;
    if (next < 0 || next >= slides.length) return;
    haptic("tap");
    setDir(step);
    setIndex(next);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -60 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1);
  }

  async function finish(askPush: boolean) {
    if (askPush && push === "prompt") {
      setBusy(true);
      await enablePush().catch(() => null);
      setBusy(false);
    }
    haptic("success");
    onDone();
  }

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex flex-col overflow-hidden bg-[#0b241d] text-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label="Танилцуулга"
    >
      <div className="relative h-[60dvh] shrink-0 overflow-hidden">
        <AnimatePresence initial={false}>
          {image ? (
            <motion.div
              key={slide.key}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-[#0b241d]" />
        <button
          type="button"
          onClick={() => void finish(false)}
          className="absolute right-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 rounded-full bg-black/35 px-4 py-2 text-sm font-semibold text-white/90"
        >
          Алгасах
        </button>
      </div>

      <motion.div
        className="relative z-10 flex flex-1 touch-pan-y flex-col px-7 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        onDragEnd={onDragEnd}
      >
        <div className="-mt-10 flex-1">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={slide.key}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[#7ef0e0]">{slide.eyebrow}</p>
              <h2 className="mt-3 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.03em]">{slide.title}</h2>
              <p className="mt-4 text-[0.98rem] leading-relaxed text-white/72">{slide.text}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-2 py-5" aria-hidden>
          {slides.map((s, i) => (
            <span key={s.key} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-7 bg-[#e8b86d]" : "w-1.5 bg-white/25"}`} />
          ))}
        </div>

        {last ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void finish(true)}
              className="h-14 w-full rounded-2xl bg-[#e8b86d] text-[0.95rem] font-bold text-[#0b241d] transition active:scale-[0.98] disabled:opacity-70"
            >
              {busy ? "…" : push === "prompt" ? "🔔 Мэдэгдэл асаагаад эхлэх" : "Эхлэх"}
            </button>
            {push === "prompt" ? (
              <button type="button" onClick={() => void finish(false)} className="h-11 w-full text-sm font-semibold text-white/60">
                Дараа асаана
              </button>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => go(1)}
            className="h-14 w-full rounded-2xl bg-white text-[0.95rem] font-bold text-[#0b241d] transition active:scale-[0.98]"
          >
            Дараах
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
