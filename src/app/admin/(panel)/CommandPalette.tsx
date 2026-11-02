"use client";

import { navFor } from "@/app/admin/(panel)/admin-nav";
import type { SearchHit } from "@/app/api/admin/search/route";
import { can, type Role } from "@/lib/permissions";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

const OPEN_EVENT = "admin:palette";
const noop = () => () => {};

/** Opens the palette from anywhere (a button, a shortcut hint). */
export const openPalette = () => window.dispatchEvent(new Event(OPEN_EVENT));

type Entry = { key: string; section: string; title: string; sub: string; href: string; mark: string };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Ctrl+K / ⌘K / "/" — jump to any screen, run a quick action, find a booking, tour or
 * article, or hand the question to the AI assistant. Fully keyboard driven.
 */
export function CommandPalette({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    const show = () => {
      setQ("");
      setHits([]);
      setIndex(0);
      setOpen(true);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        show();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener(OPEN_EVENT, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => input.current?.focus(), 30);
  }, [open]);

  // Server search (bookings, tours, news), debounced
  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 2) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal, cache: "no-store" });
        if (res.ok) setHits(((await res.json()) as { hits: SearchHit[] }).hits);
      } catch {
        // aborted or offline
      } finally {
        setSearching(false);
      }
    }, 180);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [q, open]);

  const entries = useMemo(() => {
    const term = norm(q);
    const pages: Entry[] = navFor(role)
      .flatMap((g) => g.items.map((i) => ({ ...i, group: g.title })))
      .filter((i) => !term || norm(`${i.label} ${i.hint} ${i.keywords ?? ""} ${i.group}`).includes(term))
      .map((i) => ({ key: `p:${i.href}`, section: "Хуудас", title: i.label, sub: i.hint, href: i.href, mark: "↳" }));
    const actions: Entry[] = [];
    if (can(role, "content.manage")) {
      actions.push({ key: "a:tour", section: "Үйлдэл", title: "Шинэ аялал нэмэх", sub: "Аяллын засварлагч", href: "/admin/tours/new", mark: "+" });
      actions.push({ key: "a:news", section: "Үйлдэл", title: "Шинэ мэдээ бичих", sub: "Мэдээний засварлагч", href: "/admin/news/new", mark: "+" });
    }
    if (can(role, "bookings.view")) actions.push({ key: "a:unread", section: "Үйлдэл", title: "Хариулаагүй чатууд", sub: "Захиалга › Хариулаагүй", href: "/admin?f=unread", mark: "!" });
    const filteredActions = actions.filter((a) => !term || norm(`${a.title} ${a.sub}`).includes(term));
    const found: Entry[] =
      term.length >= 2
        ? hits.map((h) => ({ key: `h:${h.kind}:${h.id}`, section: "Хайлтын үр дүн", title: h.title, sub: h.sub, href: h.href, mark: h.kind === "booking" ? "#" : h.kind === "tour" ? "✈" : "¶" }))
        : [];
    const ai: Entry[] =
      term && can(role, "agent.use") ? [{ key: "ai", section: "AI туслах", title: `AI-аас асуух: «${q.trim()}»`, sub: "Grok бодит өгөгдлөөр хариулна", href: `/admin/agent?ask=${encodeURIComponent(q.trim())}`, mark: "✦" }] : [];
    return [...found, ...pages, ...filteredActions, ...ai];
  }, [q, hits, role]);

  const active = Math.min(index, Math.max(0, entries.length - 1));

  function go(entry: Entry | undefined) {
    if (!entry) return;
    setOpen(false);
    router.push(entry.href);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, entries.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(entries[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-[#062a2a]/45 px-3 pt-[max(4rem,12vh)] backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-label="Командын цонх"
            initial={{ y: -12, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -8, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-soft)] shadow-[0_30px_80px_rgba(6,42,42,0.25)]"
          >
            <div className="flex items-center gap-3 border-b border-[var(--line)] px-4">
              <span className="font-mono text-lg text-accent">›</span>
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setIndex(0);
                  if (e.target.value.trim().length < 2) setHits([]);
                }}
                onKeyDown={onKey}
                placeholder="Хуудас, захиалгын код, нэр, аялал… эсвэл AI-аас асуух"
                className="h-14 min-w-0 flex-1 bg-transparent font-mono text-[0.95rem] text-ink outline-none placeholder:font-sans"
                aria-label="Хайх"
              />
              {searching ? <span className="size-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" /> : null}
              <kbd className="hidden rounded-md border border-[var(--line)] px-1.5 py-0.5 font-mono text-[0.65rem] text-muted sm:block">Esc</kbd>
            </div>

            <div ref={list} className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain p-2">
              {entries.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted">Олдсонгүй.</p> : null}
              {entries.map((e, i) => (
                <div key={e.key}>
                  {i === 0 || entries[i - 1].section !== e.section ? (
                    <p className="px-3 pb-1 pt-3 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted">{e.section}</p>
                  ) : null}
                  <button
                    type="button"
                    data-index={i}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => go(e)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${i === active ? "bg-accent/[0.1] text-ink" : "text-ink/85"}`}
                  >
                    <span className={`grid size-7 shrink-0 place-items-center rounded-lg font-mono text-sm ${i === active ? "bg-accent text-white" : "bg-accent/10 text-accent"}`}>{e.mark}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{e.title}</span>
                      <span className="block truncate text-xs text-muted">{e.sub}</span>
                    </span>
                    {i === active ? <span className="font-mono text-xs text-accent">↵</span> : null}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 border-t border-[var(--line)] px-4 py-2 font-mono text-[0.65rem] text-muted">
              <span>↑↓ сонгох</span>
              <span>↵ нээх</span>
              <span className="ml-auto">Ctrl K · /</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
