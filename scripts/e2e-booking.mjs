// End-to-end check of the booking and payment flow against the real Supabase project.
//   npm run build && npm run e2e
// Starts its own `next start` with QPay and И-баримт in mock mode, push and AI replies off,
// books a real tour as "E2E TEST", pays it through the mock invoice, then deletes everything it made.

import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"(.*)"$/, "$1")]),
);
if (!existsSync(path.join(root, ".next", "BUILD_ID"))) throw new Error("Run `npm run build` first");
if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY missing in .env.local");

const PORT = 3017;
const base = `http://127.0.0.1:${PORT}`;
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const created = new Set();
let failed = 0;

function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}

const json = async (res) => res.json().catch(() => ({}));
const book = (body) => fetch(`${base}/api/bookings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const trip = (token, body) =>
  fetch(`${base}/api/trip`, {
    method: body ? "POST" : "GET",
    headers: { "x-trip-token": token, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const pay = (route, token, body = {}) =>
  fetch(`${base}/api/payments/qpay/${route}`, { method: "POST", headers: { "x-trip-token": token, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const randomPhone = () => "8" + String(Math.floor(Math.random() * 1e7)).padStart(7, "0");

const server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "-p", String(PORT), "-H", "127.0.0.1"], {
  cwd: root,
  // Values set here win over .env.local; a blank Firebase config disables push
  env: { ...process.env, QPAY_MODE: "mock", EBARIMT_MODE: "mock", AI_TRIP_REPLIES: "off", FIREBASE_PROJECT_ID: " ", FIREBASE_CLIENT_EMAIL: " ", FIREBASE_PRIVATE_KEY: " " },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base, { redirect: "manual" })).status < 500) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start:\n${serverLog}`);
}

/** Pays the booking's first open option through the mock invoice; returns the paid payment id. */
async function payNext(token, expectKind) {
  const before = await json(await trip(token));
  const option = before.payOptions?.find((o) => !expectKind || o.kind === expectKind);
  check(`pay option "${expectKind ?? "any"}" is offered`, !!option, JSON.stringify(before.payOptions));
  if (!option) return null;

  const invoice = await json(await pay("create", token, { kind: option.kind }));
  check(`QPay invoice opened for ${option.kind} (${option.amount})`, !!invoice.paymentId && invoice.mock === true && invoice.amount === option.amount, JSON.stringify(invoice));
  const again = await json(await pay("create", token, { kind: option.kind }));
  check("same invoice is reused instead of opening a second one", again.paymentId === invoice.paymentId);

  const early = await fetch(`${base}/api/payments/qpay/callback?payment=${encodeURIComponent(invoice.paymentId)}`);
  const stillUnpaid = await json(await trip(token));
  check("a callback before the customer pays changes nothing", early.status === 200 && stillUnpaid.paidAmount === before.paidAmount);

  const paid = await pay("mock-pay", token, { paymentId: invoice.paymentId });
  check("customer pays the mock invoice", paid.status === 200, await paid.text());
  const after = await json(await pay("status", token));
  check(`paid amount rises by ${option.amount}`, after.paidAmount === before.paidAmount + option.amount, `${before.paidAmount} → ${after.paidAmount}`);

  const replay = await fetch(`${base}/api/payments/qpay/callback?payment=${encodeURIComponent(invoice.paymentId)}`);
  const afterReplay = await json(await trip(token));
  check("a repeated callback is applied only once", replay.status === 200 && afterReplay.paidAmount === after.paidAmount);
  return after;
}

try {
  await waitForServer();

  // Hardening
  const home = await fetch(base);
  check("security headers are sent", home.headers.get("x-content-type-options") === "nosniff" && home.headers.get("x-frame-options") === "DENY");
  if (env.SUPABASE_PUBLISHABLE_KEY) {
    const h = { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}` };
    const rows = await fetch(`${env.SUPABASE_URL}/rest/v1/booking_requests?select=id&limit=1`, { headers: h });
    check("the public key cannot read bookings", rows.status === 401 || rows.status === 403, `${rows.status} ${await rows.text()}`);
    const rpc = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/site_stats`, { method: "POST", headers: { ...h, "Content-Type": "application/json" }, body: '{"p_from":"2020-01-01","p_to":"2030-01-01"}' });
    check("the public key cannot call site_stats", rpc.status === 401 || rpc.status === 403 || rpc.status === 404, `${rpc.status}`);
  }

  // Validation
  const { data: tourRows } = await sb.from("tours").select("id, data");
  const bookable = (tourRows ?? []).filter((r) => r.data?.tag !== "soon" && r.data?.status !== "ended" && r.data?.price);
  if (!bookable.length) throw new Error("No bookable tour in the database");
  const dateOf = (t) => (t.data.dates ?? "").split("·").map((d) => d.trim()).filter(Boolean)[0];

  const badPhone = await book({ tourId: bookable[0].id, date: dateOf(bookable[0]), name: "E2E TEST", phone: "12", adults: 1 });
  check("a malformed phone is rejected", badPhone.status === 400);
  const noTour = await book({ tourId: "no-such-tour", name: "E2E TEST", phone: randomPhone(), adults: 1 });
  check("an unknown tour is rejected", noTour.status === 400);
  const bot = await json(await book({ tourId: bookable[0].id, name: "E2E TEST", phone: randomPhone(), adults: 1, website: "http://spam" }));
  const { data: botRow } = await sb.from("booking_requests").select("id").eq("id", bot.id ?? "").maybeSingle();
  check("a honeypot submission is dropped without saving", !!bot.id && !botRow);

  // Booking (price comes from the server even if the browser sends its own)
  let booking = null;
  for (const t of bookable.slice(0, 2)) {
    const res = await book({ tourId: t.id, date: dateOf(t), name: "E2E TEST", phone: randomPhone(), adults: 1, total: 1, deposit: 1 });
    const body = await json(res);
    if (body.id) created.add(body.id);
    if (res.status === 201 && body.status === "new") {
      booking = { ...body, tour: t.id };
      break;
    }
  }
  check("a booking is created", !!booking);
  if (!booking) throw new Error("Could not create a booking (every tried departure is full?)");
  const { data: row } = await sb.from("booking_requests").select("total, deposit, status, access_token").eq("id", booking.id).single();
  check("the stored price is the server's quote, not the browser's", Number(row.total) === booking.total && booking.total > 1 && Number(row.deposit) <= Number(row.total), JSON.stringify(row));

  // Trip page
  check("a wrong trip token finds nothing", (await trip("x".repeat(32))).status === 404);
  const view = await json(await trip(booking.token));
  check("the trip page opens with the token", view.status === "new" && view.paidAmount === 0 && view.messages?.length >= 1, JSON.stringify({ status: view.status, paid: view.paidAmount }));
  const msg = await json(await trip(booking.token, { action: "message", body: "E2E тест мессеж" }));
  check("the traveller can write in the trip chat", msg.messages?.some((m) => m.sender === "traveller" && m.body === "E2E тест мессеж"));

  // Payment: deposit first when the tour has one, then the balance
  const hasDeposit = view.payOptions?.some((o) => o.kind === "deposit");
  let state = await payNext(booking.token, hasDeposit ? "deposit" : "full");
  if (hasDeposit && state) {
    check("the deposit confirms the booking", state.status === "confirmed", state.status);
    state = await payNext(booking.token, "balance");
  }
  check("the fully paid booking is marked paid", state?.status === "paid" && state.paidAmount === booking.total, `${state?.status} ${state?.paidAmount}/${booking.total}`);
  check("an И-баримт is issued for every payment", state?.receipts?.length === (hasDeposit ? 2 : 1), `${state?.receipts?.length}`);
  const extra = await pay("create", booking.token, { kind: "full" });
  check("nothing more can be charged once paid", extra.status === 400);

  // Abuse
  const flood = [];
  for (let i = 0; i < 6; i++) flood.push((await book({ tourId: "no-such-tour", name: "E2E TEST", phone: randomPhone(), adults: 1 })).status);
  check("booking requests are rate limited", flood.includes(429), flood.join(","));
} catch (e) {
  failed++;
  console.error("✗", e instanceof Error ? e.message : e);
} finally {
  if (created.size) await sb.from("booking_requests").delete().in("id", [...created]);
  server.kill();
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
