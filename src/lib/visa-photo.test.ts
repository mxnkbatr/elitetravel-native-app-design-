import { analyzeVisaPhoto } from "@/lib/visa-photo";
import { describe, expect, it } from "vitest";

/** A w×h image: background colour everywhere, with a darker "person" block in the lower middle. */
function photo(w: number, h: number, bg: [number, number, number], noise = 0) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const person = x > w * 0.25 && x < w * 0.75 && y > h * 0.2;
      const n = noise ? (((x * 7 + y * 13) % 17) / 17 - 0.5) * noise : 0;
      const [r, g, b] = person ? [120, 90, 80] : bg;
      data[i] = r + n;
      data[i + 1] = g + n;
      data[i + 2] = b + n;
      data[i + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}

const check = (r: ReturnType<typeof analyzeVisaPhoto>, id: string) => r.checks.find((c) => c.id === id)!.ok;

describe("visa photo checks", () => {
  it("passes a proper photo", () => {
    const r = analyzeVisaPhoto(photo(420, 540, [250, 250, 248]));
    expect(r.ok).toBe(true);
  });

  it("rejects a coloured background", () => {
    expect(check(analyzeVisaPhoto(photo(420, 540, [90, 140, 220])), "background")).toBe(false);
  });

  it("rejects a grey, uneven background", () => {
    expect(check(analyzeVisaPhoto(photo(420, 540, [170, 170, 170], 90)), "background")).toBe(false);
  });

  it("rejects the wrong shape and a tiny image", () => {
    const wide = analyzeVisaPhoto(photo(800, 450, [250, 250, 250]));
    expect(check(wide, "ratio")).toBe(false);
    const tiny = analyzeVisaPhoto(photo(140, 180, [250, 250, 250]));
    expect(check(tiny, "size")).toBe(false);
  });
});
