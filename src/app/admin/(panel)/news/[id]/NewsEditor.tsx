"use client";

import { saveNews } from "@/app/admin/(panel)/actions";
import { AdminTitle } from "@/app/admin/(panel)/AdminTitle";
import Link from "next/link";
import { Field, ImageField, inputClass, Section } from "@/app/admin/(panel)/fields";
import { SaveBar } from "@/app/admin/(panel)/SaveBar";
import type { NewsCategory, NewsItem } from "@/data/news";
import { useState } from "react";

const CATEGORIES: NewsCategory[] = ["Мэдээ", "Урамшуулал", "Зөвлөгөө"];

export function NewsEditor({ initial, originalId, tours }: { initial: NewsItem; originalId: string | null; tours: { id: string; title: string }[] }) {
  const [item, setItem] = useState<NewsItem>(initial);
  // What was last saved; anything different is an unsaved edit
  const [saved, setSaved] = useState(() => JSON.stringify([initial, initial.body.join("\n\n")]));
  // Paragraphs are edited as one text, separated by a blank line
  const [bodyText, setBodyText] = useState(initial.body.join("\n\n"));
  const set = <K extends keyof NewsItem>(key: K, value: NewsItem[K]) => setItem((n) => ({ ...n, [key]: value }));
  const paragraphs = () => bodyText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-28">
      <Link href="/admin/news" className="inline-flex text-sm font-semibold text-accent">
        ‹ Мэдээ
      </Link>
      <AdminTitle title={originalId ? item.title || "Мэдээ" : "Шинэ мэдээ"} />

      <Section title="Мэдээ">
        <Field label="Гарчиг" wide>
          <input value={item.title} onChange={(e) => set("title", e.target.value)} className={inputClass} />
        </Field>
        <Field label="ID" hint="Жижиг латин үсэг, тоо, зураас — жишээ: bali-december">
          <input value={item.id} onChange={(e) => set("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className={inputClass} />
        </Field>
        <Field label="Ангилал">
          <select value={item.category} onChange={(e) => set("category", e.target.value as NewsCategory)} className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Холбогдох аялал" hint="«Аялал үзэх» товч гарна">
          <select value={item.tourId ?? ""} onChange={(e) => set("tourId", e.target.value || undefined)} className={inputClass}>
            <option value="">—</option>
            {tours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Унших хугацаа (мин)">
          <input inputMode="numeric" value={item.readMin} onChange={(e) => set("readMin", Number(e.target.value.replace(/\D/g, "")) || 1)} className={inputClass} />
        </Field>
        <ImageField label="Зураг" value={item.image} onChange={(v) => set("image", v)} />
        <Field label="Товч" hint="Жагсаалт, хайлтад гарна" wide>
          <textarea rows={2} value={item.excerpt} onChange={(e) => set("excerpt", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Агуулга" hint="Догол мөрүүдийг хоосон мөрөөр тусгаарла" wide>
          <textarea rows={10} value={bodyText} onChange={(e) => setBodyText(e.target.value)} className={inputClass} />
        </Field>
      </Section>

      <SaveBar
        kind="news"
        id={item.id}
        originalId={originalId}
        dirty={JSON.stringify([item, bodyText]) !== saved}
        onSave={async () => {
          const res = await saveNews({ ...item, body: paragraphs() }, originalId);
          if (res.ok) setSaved(JSON.stringify([item, bodyText]));
          return res;
        }}
      />
    </div>
  );
}
