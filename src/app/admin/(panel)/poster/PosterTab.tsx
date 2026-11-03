"use client";

import { Icon } from "@/components/Icon";
import { inputClass } from "@/app/admin/(panel)/fields";
import type { Tour } from "@/data/tours";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { defaultsFromTour, downloadCanvas, drawPoster, ensureFonts, loadImage, SIZES, type PosterData, type PosterSize } from "./poster";

const LOGO = "/elite-logo-white.png";

/** Instagram post / story generator from elite-chatbot: pure <canvas>, everything runs in the browser. */
export function PosterTab({ tours }: { tours: Tour[] }) {
  const [id, setId] = useState(tours[0]?.id ?? "");
  const [d, setD] = useState<PosterData>(() => (tours[0] ? defaultsFromTour(tours[0]) : defaultsFromTour({ title: "", price: null, duration: "" })));
  const [bgSrc, setBgSrc] = useState(tours[0]?.image ?? "");
  const [url, setUrl] = useState("");
  const [size, setSize] = useState<PosterSize>("post");
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null);
  const imgs = useRef<{ bg: HTMLImageElement | null; logo: HTMLImageElement | null }>({ bg: null, logo: null });

  const redraw = useCallback(() => {
    if (cv.current && ready) drawPoster(cv.current, d, size, imgs.current.bg, imgs.current.logo);
  }, [d, size, ready]);

  useEffect(() => {
    ensureFonts()
      .then(() =>
        loadImage(LOGO)
          .then((l) => {
            imgs.current.logo = l;
          })
          .catch(() => null),
      )
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!bgSrc) {
      imgs.current.bg = null;
      redraw();
      return;
    }
    loadImage(bgSrc)
      .then((im) => {
        imgs.current.bg = im;
        setErr("");
        redraw();
      })
      .catch((e: Error) => setErr(e.message));
  }, [bgSrc, redraw]);

  useEffect(() => redraw(), [redraw]);

  function pickTour(next: string) {
    setId(next);
    const t = tours.find((x) => x.id === next);
    if (!t) return;
    setD(defaultsFromTour(t));
    setBgSrc(t.image);
  }

  function onFile(f?: File) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setBgSrc(String(r.result));
    r.readAsDataURL(f);
  }

  function download(s: PosterSize) {
    const c = document.createElement("canvas");
    drawPoster(c, d, s, imgs.current.bg, imgs.current.logo);
    try {
      downloadCanvas(c, `elite-${id}-${s}-${SIZES[s].w}x${SIZES[s].h}.png`);
    } catch {
      setErr("PNG татаж чадсангүй — зургийн URL CORS зөвшөөрөөгүй. Зургийг файлаар upload хийнэ үү.");
    }
  }

  const f = (k: keyof PosterData) => (e: ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value });
  const label = "block text-xs font-semibold text-muted";

  return (
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5">
        <label className={label}>
          Аялал
          <select value={id} onChange={(e) => pickTour(e.target.value)} className={`mt-1 ${inputClass}`}>
            {tours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Гарчиг (том)
          <input value={d.title} onChange={f("title")} className={`mt-1 ${inputClass}`} />
        </label>
        <label className={label}>
          Асуулт мөр
          <input placeholder="SURFING ХИЙЖ СУРАХ УУ?" value={d.question} onChange={f("question")} className={`mt-1 ${inputClass}`} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Өдөр/шөнө
            <input value={d.daysLine} onChange={f("daysLine")} className={`mt-1 ${inputClass}`} />
          </label>
          <label className={label}>
            Огноо
            <input value={d.dateLine} onChange={f("dateLine")} className={`mt-1 ${inputClass}`} />
          </label>
          <label className={label}>
            Хуучин үнэ
            <input value={d.oldPrice} onChange={f("oldPrice")} className={`mt-1 ${inputClass}`} />
          </label>
          <label className={label}>
            Үнэ
            <input value={d.price} onChange={f("price")} className={`mt-1 ${inputClass}`} />
          </label>
        </div>
        <div className={label}>
          Онцлог (4 хүртэл)
          <div className="mt-1 grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                value={d.features[i] ?? ""}
                onChange={(e) => {
                  const a = [...d.features];
                  a[i] = e.target.value;
                  setD({ ...d, features: a });
                }}
                className={inputClass}
              />
            ))}
          </div>
        </div>
        <label className={label}>
          Footer
          <input value={d.footer} onChange={f("footer")} className={`mt-1 ${inputClass}`} />
        </label>
        <div className={label}>
          Зураг
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-accent">
              <Icon name="upload" size={15} className="mr-1.5 inline -mt-0.5" />Upload
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <button
              type="button"
              onClick={() => setBgSrc(tours.find((t) => t.id === id)?.image ?? "")}
              className="rounded-lg bg-[#f3f6f5] px-3 py-2 text-xs font-semibold text-ink hover:bg-accent/10"
            >
              Аяллын зураг
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <input placeholder="эсвэл зургийн URL" value={url} onChange={(e) => setUrl(e.target.value)} className={inputClass} />
            <button type="button" onClick={() => setBgSrc(url.trim())} className="shrink-0 rounded-lg bg-[#f3f6f5] px-3 text-xs font-semibold text-ink hover:bg-accent/10">
              Ашиглах
            </button>
          </div>
        </div>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
      </div>

      <div className="lg:sticky lg:top-6">
        <div className="mb-3 flex gap-2">
          {(Object.keys(SIZES) as PosterSize[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${size === s ? "bg-ink text-white" : "bg-white text-muted"}`}
            >
              {SIZES[s].label}
            </button>
          ))}
        </div>
        <canvas ref={cv} className="block w-full max-w-[420px] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.2)]" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => download("post")} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
            PNG татах · Post
          </button>
          <button type="button" onClick={() => download("story")} className="rounded-full bg-[#14524c] px-4 py-2 text-sm font-semibold text-white">
            PNG татах · Story
          </button>
        </div>
      </div>
    </div>
  );
}
