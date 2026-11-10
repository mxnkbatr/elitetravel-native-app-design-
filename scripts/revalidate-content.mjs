// Bust Next.js tours/news cache after a DB script upsert.
//   node scripts/revalidate-content.mjs
// Tries localhost (dev) then SITE_URL / VERCEL preview if set.

import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
);

const secret = env.CRON_SECRET;
if (!secret) {
  console.log("CRON_SECRET missing — restart `next dev` or save a tour in /admin to refresh.");
  process.exit(0);
}

const bases = [...new Set(["http://localhost:3000", env.NEXT_PUBLIC_SITE_URL, env.SITE_URL].filter(Boolean))];

let ok = false;
for (const base of bases) {
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/revalidate-content`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
    const body = await res.text();
    console.log(`${base} → ${res.status} ${body}`);
    if (res.ok) ok = true;
  } catch (e) {
    console.log(`${base} → ${e.message}`);
  }
}
if (!ok) console.log("Could not reach a running Next server — hard-refresh after restarting `next dev`.");
