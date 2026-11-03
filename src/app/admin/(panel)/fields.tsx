"use client";

import { Icon } from "@/components/Icon";
import { signImageUpload } from "@/app/admin/(panel)/actions";
import Image from "next/image";
import { useState, type ReactNode } from "react";

export const inputClass =
  "w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[0.7rem] text-muted/80">{hint}</span> : null}
    </label>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.4rem] border border-[var(--line)] bg-white p-4 sm:p-6">
      <h2 className="mb-4 font-display text-xl font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** One item per line ↔ string[] */
export function LinesField({ label, value, onChange, rows = 4, hint }: { label: string; value: string[]; onChange: (v: string[]) => void; rows?: number; hint?: string }) {
  const [text, setText] = useState(value.join("\n"));
  return (
    <Field label={label} hint={hint ?? "Мөр бүрт нэг зүйл"} wide>
      <textarea
        value={text}
        rows={rows}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean));
        }}
        className={inputClass}
      />
    </Field>
  );
}

async function uploadToCloudinary(file: File) {
  const sig = await signImageUpload();
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", sig.apiKey);
  body.append("timestamp", String(sig.timestamp));
  body.append("folder", sig.folder);
  body.append("signature", sig.signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body });
  if (!res.ok) throw new Error("upload failed");
  const json = (await res.json()) as { secure_url: string };
  return json.secure_url;
}

function UploadButton({ onUploaded, multiple }: { onUploaded: (urls: string[]) => void; multiple?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? "Хуулж байна…" : (
          <>
            <Icon name="upload" size={15} /> Зураг оруулах
          </>
        )}
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          className="sr-only"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (!files.length) return;
            setBusy(true);
            setError(false);
            try {
              onUploaded(await Promise.all(files.map(uploadToCloudinary)));
            } catch {
              setError(true);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {error ? <span className="text-xs text-red-600">Хуулж чадсангүй</span> : null}
    </span>
  );
}

export function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} wide>
      <div className="flex flex-wrap items-start gap-3">
        <div className="relative aspect-[4/3] w-36 shrink-0 overflow-hidden rounded-xl bg-[#e7eeec]">
          {value ? <Image src={value} alt="" fill sizes="144px" className="object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://res.cloudinary.com/…" className={inputClass} />
          <UploadButton onUploaded={(urls) => onChange(urls[0])} />
        </div>
      </div>
    </Field>
  );
}

export function GalleryField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Field label="Галерей" wide>
      <div className="flex flex-wrap gap-2">
        {value.map((src, i) => (
          <div key={src + i} className="group relative aspect-square w-24 overflow-hidden rounded-xl bg-[#e7eeec]">
            <Image src={src} alt="" fill sizes="96px" className="object-cover" />
            <button
              type="button"
              aria-label="Устгах"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <UploadButton multiple onUploaded={(urls) => onChange([...value, ...urls])} />
      </div>
    </Field>
  );
}
