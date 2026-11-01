"use client";

import { readMrz, type MrzResult } from "@/lib/mrz";
import type { Worker } from "tesseract.js";

/**
 * Reads the passport's machine-readable zone from a photo, entirely in the browser: the image
 * never leaves the device. Tesseract (≈ a few MB) loads only on the first scan.
 */
let worker: Promise<Worker> | null = null;
let onProgress: ((p: number) => void) | null = null;

async function getWorker() {
  worker ??= (async () => {
    const { createWorker, PSM } = await import("tesseract.js");
    const w = await createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") onProgress?.(Math.round(m.progress * 100));
      },
    });
    await w.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });
    return w;
  })();
  try {
    return await worker;
  } catch (e) {
    worker = null;
    throw e;
  }
}

/** Grayscale + contrast stretch of a region, scaled so the MRZ characters are ~30px tall. */
function prepare(bitmap: ImageBitmap, fromY: number) {
  const width = Math.min(2000, Math.max(1200, bitmap.width));
  const scale = width / bitmap.width;
  const srcH = bitmap.height * (1 - fromY);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round(srcH * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, bitmap.height * fromY, bitmap.width, srcH, 0, 0, canvas.width, canvas.height);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) {
    const v = ((d[i] - min) / range) * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export type ScanOutcome = { ok: true; result: MrzResult } | { ok: false; reason: "no-mrz" | "failed" };

export async function scanPassport(file: File, progress?: (p: number) => void): Promise<ScanOutcome> {
  onProgress = progress ?? null;
  try {
    const bitmap = await createImageBitmap(file);
    const w = await getWorker();
    let best: MrzResult | null = null;
    // The zone sits at the bottom of the photo page: try the lower part first, then the whole photo
    for (const fromY of [0.55, 0.35, 0]) {
      const { data } = await w.recognize(prepare(bitmap, fromY));
      const r = readMrz(data.text);
      if (r?.valid) return { ok: true, result: r };
      if (r && (!best || (r.name && !best.name))) best = r;
    }
    bitmap.close();
    return best ? { ok: true, result: best } : { ok: false, reason: "no-mrz" };
  } catch (e) {
    console.error("passport scan failed", e);
    return { ok: false, reason: "failed" };
  } finally {
    onProgress = null;
  }
}
