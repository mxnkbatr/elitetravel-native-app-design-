"use client";

import { Icon, type IconName } from "@/components/Icon";
import { Contact } from "@/components/Contact";
import { useStays } from "@/components/ResortsPage";
import { destinations, isBookable } from "@/data/tours";
import { cldImage } from "@/lib/cloudinary";
import { useTours } from "@/lib/content";
import { animate, motion, useInView, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const ease = [0.22, 1, 0.36, 1] as const;
const img = (n: string) => cldImage(`elitetravel/tours/${n}`);

const collage = [img("tropical-aerial-coast"), img("victoria-peak"), img("nusa-penida-kelingking")];

function useStats() {
  const tours = useTours();
  const stays = useStays();
  return [
    { value: destinations.length, label: "Чиглэл" },
    { value: tours.filter(isBookable).length, label: "Нээлттэй аялал" },
    { value: stays.length, label: "Буудал" },
    { value: 4, label: "Хуваан төлөх апп" },
  ];
}

const pillars = [
  {
    en: "Curated Destinations",
    mn: "Сонгомол чиглэл",
    body: "Хайнань, Бали, Хонг Конг — бид өөрсдөө туршиж, итгэлтэй байгаа чиглэлүүдээ л санал болгодог.",
    image: img("day2-baishilin-glass-bridge"),
  },
  {
    en: "Premium Experience",
    mn: "Тансаг туршлага",
    body: "Шилэн гүүр, дарвуулт завь, Атлантис усан парк, концертын тасалбар — мэргэжлийн хөтөлбөртэй.",
    image: img("yacht-party-day4"),
  },
  {
    en: "Trusted Service",
    mn: "Найдвартай үйлчилгээ",
    body: "Монгол хөтөч, аяллын даатгал, урьдчилан тодорхой үнэ. Захиалгаас буцах хүртэл хамт байна.",
    image: img("day7-resort-pool"),
  },
];

const steps = [
  { icon: "compass" as IconName, title: "Аяллаа сонго", body: "Огноо, хөтөлбөр, үнийг сайтаас харьцуулж сонгоно." },
  { icon: "calculator" as IconName, title: "Тооцоол", body: "Хүн, хүүхэд, өрөөгөө тохируулж нийт дүнгээ шууд харна." },
  { icon: "chat" as IconName, title: "Хүсэлт илгээ", body: "Instagram эсвэл утсаар манай багт хүсэлтээ илгээнэ." },
  { icon: "badge-check" as IconName, title: "Баталгаажуул", body: "Баг суудал, үнийг баталгаажуулж, 30–50% урьдчилгаа авна." },
  { icon: "plane" as IconName, title: "Аялаарай", body: "Монгол хөтөчтэйгээ хамт нисэж, мартагдашгүй аялалд гарна." },
];

const payments = ["Pocket", "Toki", "Simple", "Dari"];

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.4, ease, onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{n}</span>;
}

const fade = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.8, ease },
};

export function About() {
  const stats = useStats();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const yA = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const yB = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const yC = useTransform(scrollYProgress, [0, 1], [0, -110]);

  return (
    <div className="space-y-20 sm:space-y-28">
      {/* Hero */}
      <div ref={heroRef} className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.div {...fade} className="flex items-center gap-3">
            <span className="epic-rule" />
            <p className="type-eyebrow text-accent">About Elite Travel</p>
          </motion.div>
          <h1 className="mt-5 font-display text-[clamp(2.8rem,7vw,5.6rem)] font-semibold leading-[0.92] tracking-[-0.045em]">
            {["Travel", "Beyond", "Ordinary."].map((w, i) => (
              <span key={w} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className={`inline-block ${i === 1 ? "italic text-accent" : ""}`}
                  initial={{ y: "105%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, delay: 0.1 + i * 0.1, ease }}
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease }}
            className="mt-6 max-w-md text-lg leading-relaxed text-muted"
          >
            Бид аяллыг зөвхөн нэг газраас нөгөөд хүрэх хөдөлгөөн бус,{" "}
            <span className="font-semibold text-foam">мартагдашгүй туршлага</span> гэж хардаг.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 flex flex-wrap gap-3">
            <Link href="/tours" className="btn-shine inline-flex h-12 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white">
              Аяллууд үзэх →
            </Link>
            <a href="#contact" className="inline-flex h-12 items-center rounded-full border border-[var(--line)] px-6 text-sm font-semibold">
              Холбогдох
            </a>
          </motion.div>
        </div>

        {/* Collage */}
        <div className="relative mx-auto h-[380px] w-full max-w-[460px] sm:h-[480px]">
          {[
            { y: yA, cls: "left-0 top-6 h-[62%] w-[58%] rotate-[-4deg]", src: collage[0], delay: 0.15 },
            { y: yB, cls: "right-0 top-0 h-[48%] w-[46%] rotate-[5deg]", src: collage[1], delay: 0.3 },
            { y: yC, cls: "bottom-0 right-6 h-[52%] w-[56%] rotate-[-2deg]", src: collage[2], delay: 0.45 },
          ].map((p) => (
            <motion.div
              key={p.src}
              style={{ y: p.y }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: p.delay, duration: 0.9, ease }}
              className={`absolute overflow-hidden rounded-[1.5rem] border-4 border-bg-elevated shadow-[0_24px_60px_rgba(6,42,42,0.22)] ${p.cls}`}
            >
              <Image src={p.src} alt="" fill className="object-cover" sizes="(max-width:640px) 60vw, 280px" priority />
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.75, type: "spring", stiffness: 200, damping: 14 }}
            className="absolute bottom-10 left-2 grid size-24 place-items-center rounded-full bg-[#e8b86d] text-center text-ink shadow-lg"
          >
            <span className="font-display text-sm font-semibold leading-tight">
              Explore
              <br />
              Dream
              <br />
              Discover
            </span>
          </motion.div>
        </div>
      </div>

      {/* Stats */}
      <motion.dl {...fade} className="grid grid-cols-2 gap-px overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-bg-elevated p-6 text-center sm:p-8">
            <dd className="font-num text-[2.6rem] leading-none text-accent sm:text-5xl">
              <CountUp to={s.value} />
            </dd>
            <dt className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{s.label}</dt>
          </div>
        ))}
      </motion.dl>

      {/* Pillars */}
      <section>
        <motion.h2 {...fade} className="max-w-xl font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
          Бидний <span className="italic text-accent">амлалт</span>
        </motion.h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {pillars.map((p, i) => (
            <motion.article
              key={p.en}
              {...fade}
              transition={{ ...fade.transition, delay: i * 0.1 }}
              className="group relative min-h-[300px] overflow-hidden rounded-[1.75rem] bg-[#062a2a] p-7 text-white"
            >
              <Image src={p.image} alt="" fill className="object-cover opacity-30 transition duration-700 group-hover:scale-105 group-hover:opacity-55" sizes="(max-width:768px) 100vw, 33vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#062a2a] via-[#062a2a]/60 to-transparent" />
              <div className="relative flex h-full flex-col">
                <span className="font-num text-sm text-[#e8b86d]">0{i + 1}</span>
                <p className="mt-auto pt-24 type-eyebrow text-[#7ef0e0]">{p.en}</p>
                <h3 className="mt-2 font-display text-[1.9rem] font-semibold leading-tight">{p.mn}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{p.body}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section>
        <motion.div {...fade} className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
            Аялал хэрхэн <span className="italic text-accent">эхэлдэг</span> вэ?
          </h2>
          <p className="text-sm text-muted">Сонгохоос нисэх хүртэл 5 алхам</p>
        </motion.div>
        <ol className="relative mt-10 grid gap-6 md:grid-cols-5 md:gap-4">
          <motion.span
            aria-hidden
            className="absolute left-6 top-6 hidden h-[2px] w-[calc(100%-3rem)] origin-left bg-gradient-to-r from-accent to-[#e8b86d] md:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.6, ease }}
          />
          <span aria-hidden className="absolute bottom-6 left-6 top-6 w-[2px] bg-[var(--line)] md:hidden" />
          {steps.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.6, ease }}
              className="relative flex gap-4 md:block"
            >
              <span className="relative z-10 grid size-12 shrink-0 place-items-center rounded-full border-4 border-bg bg-bg-elevated text-accent shadow-[0_8px_24px_rgba(6,42,42,0.12)]">
                <Icon name={s.icon} size={20} />
              </span>
              <div className="md:mt-4">
                <p className="type-label text-accent">Алхам {i + 1}</p>
                <p className="mt-1 font-display text-xl font-semibold">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* Payments */}
      <motion.section {...fade} className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#e8b86d] to-[#f3d199] p-7 text-ink sm:p-10">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="type-eyebrow">Хуваан төлөх</p>
            <h2 className="mt-2 font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-semibold leading-tight">Мөрөөдлийн аяллаа одоо захиалаад, дараа нь төл.</h2>
            <p className="mt-2 max-w-lg text-sm text-ink/70">Урьдчилгаа 30–50%. Үлдэгдлээ зээлийн апп, fintech-үүдээр хувааж төлөх боломжтой.</p>
          </div>
          <ul className="flex flex-wrap gap-2 md:max-w-[260px] md:justify-end">
            {payments.map((p, i) => (
              <motion.li
                key={p}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 300, damping: 18 }}
                className="rounded-2xl bg-white/80 px-5 py-3 font-semibold shadow-sm"
              >
                {p}
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-28">
        <motion.div {...fade} className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
            Холбоо <span className="italic text-accent">барих</span>
          </h2>
          <p className="text-sm text-muted">X · @elitetravelmn</p>
        </motion.div>
        <Contact />
      </section>
    </div>
  );
}
