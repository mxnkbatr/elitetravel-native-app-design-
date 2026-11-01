// Pure <canvas> poster renderer (no dependencies). Elite Travel style:
// full-bleed photo, dark gradient, logo top-center, huge slanted white title, question line,
// days/nights, struck-through old price, teal→green price + MNT, feature pill, footer.
export type PosterData = {
  title: string; question: string; daysLine: string; dateLine: string;
  oldPrice: string; price: string; features: string[]; footer: string;
};
export type PosterSize = 'post' | 'story';
export const SIZES: Record<PosterSize, { w: number; h: number; label: string }> = {
  post: { w: 1080, h: 1350, label: 'Post 1080×1350' },
  story: { w: 1080, h: 1920, label: 'Story 1080×1920' },
};
export const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Rubik:ital,wght@1,900&family=Montserrat:wght@500;600&display=swap';

export async function ensureFonts() {
  if (typeof document === 'undefined') return;
  if (!document.querySelector(`link[href="${FONT_CSS_URL}"]`)) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONT_CSS_URL; document.head.appendChild(l);
    await new Promise((r) => { l.onload = r; l.onerror = r; });
  }
  await Promise.all(['italic 900 100px Rubik', '700 100px Oswald', '600 100px Oswald', '500 40px Oswald', '500 30px Montserrat']
    .map((f) => document.fonts.load(f, 'АБВ ӨөҮү abc 123').catch(() => null)));
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image(); if (!src.startsWith('data:') && !src.startsWith('blob:') && !src.startsWith('/')) im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = () => rej(new Error('Зураг ачаалж чадсангүй (URL нь CORS зөвшөөрөөгүй байж болно — файлаар upload хийнэ үү)'));
    im.src = src;
  });
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, start: number, maxW: number, min = 20) {
  let px = start; ctx.font = font(px);
  while (px > min && ctx.measureText(text).width > maxW) { px -= 4; ctx.font = font(px); }
  return px;
}
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // centered text with letter-spacing
  const chars = [...text]; const w = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
  let cx = x - w / 2; ctx.textAlign = 'left';
  for (const c of chars) { ctx.fillText(c, cx, y); cx += ctx.measureText(c).width + spacing; }
  ctx.textAlign = 'center'; return w;
}

export function drawPoster(canvas: HTMLCanvasElement, d: PosterData, size: PosterSize, bg?: HTMLImageElement | null, logo?: HTMLImageElement | null) {
  const { w: W, h: H } = SIZES[size];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  // background (cover)
  ctx.fillStyle = '#1c2a28'; ctx.fillRect(0, 0, W, H);
  if (bg) {
    const s = Math.max(W / bg.width, H / bg.height), iw = bg.width * s, ih = bg.height * s;
    ctx.drawImage(bg, (W - iw) / 2, (H - ih) / 2, iw, ih);
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.18, 'rgba(0,0,0,0.05)'); g.addColorStop(0.42, 'rgba(0,0,0,0.25)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const B = (y: number) => H - (1350 - y); // anchor bottom block to bottom
  // logo
  const logoTop = size === 'story' ? 150 : 70;
  if (logo) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18; const lh = 140, lw = (logo.width / logo.height) * lh; ctx.drawImage(logo, (W - lw) / 2, logoTop, lw, lh); ctx.shadowColor = 'transparent'; }
  else { ctx.fillStyle = '#fff'; ctx.font = '600 44px Montserrat'; spaced(ctx, 'ELITE', W / 2, logoTop + 90, 14); }

  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
  // title: huge, slanted
  const title = d.title.toUpperCase();
  const tpx = fitFont(ctx, title, (p) => `italic 900 ${p}px Rubik`, 250, W * 0.84, 80);
  const titleY = size === 'story' ? B(700) - 120 : 690;
  ctx.save(); ctx.translate(W / 2, titleY); ctx.rotate(-0.05); ctx.transform(1, 0, -0.12, 1, 0, 0);
  ctx.fillStyle = '#fff'; ctx.fillText(title, 0, 0); ctx.restore();
  void tpx;

  // question
  ctx.fillStyle = '#fff';
  if (d.question) { fitFont(ctx, d.question.toUpperCase(), (p) => `600 ${p}px Oswald`, 64, W * 0.86); spaced(ctx, d.question.toUpperCase(), W / 2, B(842), 1.5); }
  // days + date
  ctx.font = '500 40px Oswald';
  const sub = [d.daysLine, d.dateLine].filter(Boolean).join('  •  ').toUpperCase();
  if (sub) { fitFont(ctx, sub, (p) => `500 ${p}px Oswald`, 40, W * 0.86); spaced(ctx, sub, W / 2, B(918), 2); }
  ctx.shadowColor = 'transparent';
  // old price (struck)
  if (d.oldPrice) {
    ctx.font = '500 40px Oswald'; ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const t = `${d.oldPrice} MNT`; const w = spaced(ctx, t, W / 2, B(990), 1);
    ctx.strokeStyle = '#e0473f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(W / 2 - w / 2 - 4, B(976)); ctx.lineTo(W / 2 + w / 2 + 4, B(976)); ctx.stroke();
  }
  // price with gradient + MNT
  if (d.price) {
    const ppx = fitFont(ctx, d.price, (p) => `700 ${p}px Oswald`, 150, W * 0.62, 60);
    ctx.font = `700 ${ppx}px Oswald`; const pw = ctx.measureText(d.price).width;
    ctx.font = `700 ${Math.round(ppx * 0.5)}px Oswald`; const mw = ctx.measureText('MNT').width;
    const gap = 28, total = pw + gap + mw, x0 = (W - total) / 2, py = B(1140);
    const pg = ctx.createLinearGradient(x0, 0, x0 + total, 0);
    pg.addColorStop(0, '#22b8f0'); pg.addColorStop(0.45, '#3fd9c4'); pg.addColorStop(0.8, '#8fe08a'); pg.addColorStop(1, '#d6f05a');
    ctx.fillStyle = pg; ctx.textAlign = 'left';
    ctx.font = `700 ${ppx}px Oswald`; ctx.fillText(d.price, x0, py);
    ctx.font = `700 ${Math.round(ppx * 0.5)}px Oswald`; ctx.fillText('MNT', x0 + pw + gap, py - 4);
    ctx.textAlign = 'center';
  }
  // feature pill
  const feats = d.features.map((f) => f.trim().toUpperCase()).filter(Boolean).slice(0, 4);
  if (feats.length) {
    let fpx = 34; const dot = 34; let tw = 0;
    for (;;) { ctx.font = `600 ${fpx}px Oswald`; tw = feats.reduce((s, f) => s + ctx.measureText(f).width, 0) + dot * (feats.length - 1) * 1.6; if (tw < W * 0.8 || fpx < 20) break; fpx -= 2; }
    const ph = 76, pw2 = tw + 70, px = (W - pw2) / 2, py = B(1180);
    ctx.fillStyle = 'rgba(10,14,14,0.62)'; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(px, py, pw2, ph, ph / 2); ctx.fill(); ctx.stroke();
    let cx = px + 35; ctx.textAlign = 'left'; const ty = py + ph / 2 + fpx * 0.36;
    feats.forEach((f, i) => {
      ctx.fillStyle = '#fff'; ctx.fillText(f, cx, ty); cx += ctx.measureText(f).width;
      if (i < feats.length - 1) { ctx.fillStyle = '#3fd9c4'; ctx.beginPath(); ctx.arc(cx + dot * 0.8, py + ph / 2, 6, 0, Math.PI * 2); ctx.fill(); cx += dot * 1.6; }
    });
    ctx.textAlign = 'center';
  }
  // footer
  if (d.footer) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; fitFont(ctx, d.footer, (p) => `500 ${p}px Montserrat`, 30, W * 0.9); ctx.fillText(d.footer, W / 2, B(1305)); }
}

export function downloadCanvas(canvas: HTMLCanvasElement, name: string) {
  canvas.toBlob((b) => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, 'image/png');
}

const fmt = (n: number | null | undefined) => (n == null ? '' : n.toLocaleString('en-US').replace(/,/g, "'"));
export function defaultsFromTour(t: { title: string; price: number | null; oldPrice?: number | null; duration: string; dates?: string }): PosterData {
  const m = t.duration?.match(/(\d+)\s*ӨДӨР\s*,?\s*(\d+)\s*ШӨНӨ/i);
  const short = t.title.split(/[,:|(]/)[0].replace(/\d+-р сарын.*|үндсэн аялал|аялал/gi, '').trim() || t.title;
  return {
    title: short, question: '', daysLine: m ? `${m[1]} ӨДӨР / ${m[2]} ШӨНӨ` : (t.duration ?? ''),
    dateLine: t.dates && !/өөрчил/i.test(t.dates) ? t.dates : '',
    oldPrice: t.oldPrice && t.oldPrice !== t.price ? fmt(t.oldPrice) : '',
    price: fmt(t.price), features: ['Нислэгийн тийз', 'Буудал', 'Хөтөлбөр', 'Даатгал'],
    footer: 'elitetravel.mn • +976 90031771 • @elitetravelmn',
  };
}
