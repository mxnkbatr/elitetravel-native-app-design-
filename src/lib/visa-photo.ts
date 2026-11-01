/**
 * Quick automatic checks for a visa photo (3.5 × 4.5 cm, plain white background). They catch the
 * common mistakes before upload; staff still approve the photo.
 */

export type PhotoCheck = { id: "size" | "ratio" | "background"; ok: boolean; label: string; tip?: string };
export type PhotoReport = { ok: boolean; checks: PhotoCheck[]; width: number; height: number };

const TARGET_RATIO = 35 / 45;
/** 3.5 × 4.5 cm at 300 dpi */
const MIN_W = 413;
const MIN_H = 531;

type Pixels = { width: number; height: number; data: Uint8ClampedArray | number[] };

/** Brightness, colourfulness and evenness of the strips along the top and sides. */
function background({ width, height, data }: Pixels) {
  let n = 0;
  let sum = 0;
  let sumSq = 0;
  let chroma = 0;
  const sample = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    sum += l;
    sumSq += l * l;
    chroma += Math.max(r, g, b) - Math.min(r, g, b);
    n++;
  };
  const step = Math.max(1, Math.floor(Math.min(width, height) / 120));
  const top = Math.max(1, Math.floor(height * 0.08));
  const side = Math.max(1, Math.floor(width * 0.08));
  for (let y = 0; y < top; y += step) for (let x = 0; x < width; x += step) sample(x, y);
  // Sides only down to mid-height: below that the shoulders reach the edges
  for (let y = top; y < height * 0.55; y += step) {
    for (let x = 0; x < side; x += step) sample(x, y);
    for (let x = width - side; x < width; x += step) sample(x, y);
  }
  const mean = sum / n;
  return { mean, std: Math.sqrt(Math.max(0, sumSq / n - mean * mean)), chroma: chroma / n };
}

export function analyzeVisaPhoto(px: Pixels): PhotoReport {
  const ratio = px.width / px.height;
  const bg = background(px);
  const checks: PhotoCheck[] = [
    {
      id: "size",
      ok: px.width >= MIN_W && px.height >= MIN_H,
      label: "Чанар хангалттай",
      tip: "Зураг хэт жижиг байна. Илүү ойроос, тод зураг авна уу.",
    },
    {
      id: "ratio",
      ok: Math.abs(ratio - TARGET_RATIO) <= 0.06,
      label: "3.5 × 4.5 харьцаатай",
      tip: "Зургаа 3.5 × 4.5 харьцаагаар тайрна уу (өргөнөөсөө бага зэрэг өндөр).",
    },
    {
      id: "background",
      ok: bg.mean >= 205 && bg.chroma <= 28 && bg.std <= 24,
      label: "Цагаан, жигд дэвсгэр",
      tip: "Цагаан хананы өмнө, сүүдэргүй гэрэлд зогсож авахуулна уу.",
    },
  ];
  return { ok: checks.every((c) => c.ok), checks, width: px.width, height: px.height };
}

/** Browser wrapper: reads the file into pixels (scaled down for speed) and analyses it. */
export async function checkVisaPhoto(file: File): Promise<PhotoReport> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const report = analyzeVisaPhoto(ctx.getImageData(0, 0, canvas.width, canvas.height));
  // Size is judged on the original, not the preview
  const size = report.checks.find((c) => c.id === "size")!;
  size.ok = bitmap.width >= MIN_W && bitmap.height >= MIN_H;
  bitmap.close();
  return { ...report, ok: report.checks.every((c) => c.ok), width: bitmap.width, height: bitmap.height };
}

/** Phone photos are several MB; the upload limit is 4 MB. JPEG, longest side ≤ maxSide. PDFs pass through. */
export async function compressForUpload(file: File, maxSide = 2000, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_500_000 && file.type === "image/jpeg") {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
}
