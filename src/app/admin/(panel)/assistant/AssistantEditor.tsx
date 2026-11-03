"use client";

import { saveAssistant } from "@/app/admin/(panel)/assistant/actions";
import { toast } from "@/app/admin/(panel)/feedback";
import { Field, inputClass } from "@/app/admin/(panel)/fields";
import { Icon } from "@/components/Icon";
import { ASSISTANT_DEFAULTS, ASSISTANT_LIMITS, type AssistantSettings } from "@/lib/assistant-settings";
import { useEffect, useState, useTransition } from "react";

const EXAMPLES = [
  "Энэ долоо хоногт Бали аяллыг онцолж санал болго, 8% хямдралтай гэдгийг дурд.",
  "Хүүхэдтэй гэр бүлд Хайнань аяллыг санал болго.",
  "Виз асуувал манай багтай холбогдохыг зөвлө, баримт бичгийн жагсаалт өгөх хэрэггүй.",
];

/** Staff edit the site assistant here, with a live preview of how the chat opens. */
export function AssistantEditor({ initial, modelReady }: { initial: AssistantSettings; modelReady: boolean }) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [suggestionsText, setSuggestionsText] = useState(initial.suggestions.join("\n"));
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(s) !== saved;
  const set = <K extends keyof AssistantSettings>(k: K, v: AssistantSettings[K]) => setS((x) => ({ ...x, [k]: v }));

  function save() {
    start(async () => {
      const res = await saveAssistant(s);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      setSaved(JSON.stringify(s));
      toast("Хадгалагдлаа — сайтын чат шинэчлэгдсэн");
    });
  }

  // Unsaved edits ask before the tab closes
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  return (
    <div className="mt-6 grid gap-5 pb-28 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-5">
        {!modelReady ? (
          <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
            AI загварын түлхүүр (XAI_API_KEY эсвэл AI_GATEWAY_API_KEY) серверт тохируулаагүй тул чат одоогоор сайтад харагдахгүй.
          </p>
        ) : null}

        <section className="rounded-[1.4rem] border border-[var(--line)] bg-white p-4 sm:p-6">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block font-display text-xl font-semibold">Сайтад харуулах</span>
              <span className="mt-0.5 block text-sm text-muted">Унтраавал чатын товч сайт, апп хоёроос алга болно.</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={s.enabled}
              aria-label="Сайтад харуулах"
              onClick={() => set("enabled", !s.enabled)}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${s.enabled ? "bg-accent" : "bg-black/15"}`}
            >
              <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${s.enabled ? "left-7" : "left-1"}`} />
            </button>
          </label>
        </section>

        <section className="space-y-4 rounded-[1.4rem] border border-[var(--line)] bg-white p-4 sm:p-6">
          <h2 className="font-display text-xl font-semibold">Мэндчилгээ ба асуултууд</h2>
          <Field label="Мэндчилгээ" hint={`Чат нээгдэхэд хамгийн эхэнд гарна · ${s.greeting.length}/${ASSISTANT_LIMITS.greeting}`}>
            <textarea rows={3} maxLength={ASSISTANT_LIMITS.greeting} value={s.greeting} onChange={(e) => set("greeting", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Санал болгох асуултууд" hint={`Мөр бүрт нэг асуулт, ${ASSISTANT_LIMITS.suggestions} хүртэл. Дарахад шууд асуугдана.`}>
            <textarea
              rows={5}
              value={suggestionsText}
              onChange={(e) => {
                setSuggestionsText(e.target.value);
                set(
                  "suggestions",
                  e.target.value
                    .split("\n")
                    .map((l) => l.trim().slice(0, ASSISTANT_LIMITS.suggestion))
                    .filter(Boolean)
                    .slice(0, ASSISTANT_LIMITS.suggestions),
                );
              }}
              className={inputClass}
            />
          </Field>
        </section>

        <section className="space-y-3 rounded-[1.4rem] border border-[var(--line)] bg-white p-4 sm:p-6">
          <div>
            <h2 className="font-display text-xl font-semibold">Багийн нэмэлт заавар</h2>
            <p className="mt-1 text-sm text-muted">
              Туслах хэрхэн хариулахыг чиглүүлнэ: онцлох аялал, урамшуулал, өнгө аяс. Үнэ, огноог энд бичих шаардлагагүй — туслах аяллын бодит мэдээллийг өөрөө уншдаг.
            </p>
          </div>
          <textarea
            rows={6}
            maxLength={ASSISTANT_LIMITS.instructions}
            value={s.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            placeholder="Жишээ нь: Энэ сард Бали аяллыг онцол…"
            className={inputClass}
          />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => set("instructions", s.instructions ? `${s.instructions}\n${ex}` : ex)}
                className="rounded-full border border-[var(--line)] bg-bg px-3 py-1.5 text-left text-xs text-muted hover:border-accent/50 hover:text-ink"
              >
                + {ex}
              </button>
            ))}
          </div>
          <p className="text-[0.7rem] text-muted">
            {s.instructions.length}/{ASSISTANT_LIMITS.instructions} · Аюулгүй байдлын дүрмүүд (үнэ зохиохгүй, сэдвээс гарахгүй) үргэлж давуу эрхтэй.
          </p>
        </section>
      </div>

      {/* Live preview */}
      <aside className="lg:sticky lg:top-24">
        <p className="mb-2 px-1 text-xs font-semibold text-muted">Урьдчилан харах</p>
        <div className={`overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-[var(--bg-soft)] shadow-[0_20px_50px_rgba(10,42,38,0.12)] transition ${s.enabled ? "" : "opacity-50 grayscale"}`}>
          <div className="flex items-center gap-3 bg-[#062a2a] px-4 py-3.5 text-white">
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#e8b86d] font-display font-semibold">E</span>
            <span>
              <span className="block font-display font-semibold leading-tight">Аяллын туслах</span>
              <span className="block text-[0.7rem] text-white/65">{s.enabled ? "Онлайн" : "Унтраасан — сайтад харагдахгүй"}</span>
            </span>
          </div>
          <div className="space-y-2.5 p-3.5 text-sm">
            <p className="w-fit max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-[var(--line)] bg-white px-3 py-2 leading-relaxed">{s.greeting || ASSISTANT_DEFAULTS.greeting}</p>
            <div className="flex flex-wrap gap-1.5">
              {s.suggestions.map((q) => (
                <span key={q} className="rounded-full border border-accent/30 bg-white px-3 py-1.5 text-xs font-medium text-accent">
                  {q}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Save bar */}
      <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 px-4 lg:bottom-0 lg:left-[264px] lg:border-t lg:border-[var(--line)] lg:bg-[var(--bg-soft)]/95 lg:py-3 lg:backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-3 rounded-2xl bg-white/95 p-2 pl-4 shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur lg:bg-transparent lg:p-0 lg:shadow-none">
          {dirty ? (
            <span className="mr-auto flex items-center gap-1.5 text-sm text-amber-700">
              <span className="size-2 rounded-full bg-amber-500" /> Хадгалаагүй өөрчлөлт
            </span>
          ) : (
            <span className="mr-auto text-sm text-muted">Бүх өөрчлөлт хадгалагдсан</span>
          )}
          <button type="button" onClick={save} disabled={pending || !dirty} className="h-11 rounded-full bg-accent px-6 text-sm font-semibold text-white transition hover:bg-accent-soft disabled:opacity-50">
            {pending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}
