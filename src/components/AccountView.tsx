"use client";

import { deleteAccount, faceIdSignIn, logout, requestCode, updateProfile, useAccount, verifyCode } from "@/lib/account";
import { biometricEnabled, biometryName, disableBiometric, enableBiometric } from "@/lib/biometric";
import { haptic } from "@/lib/native";
import { useTraveller } from "@/lib/traveller-store";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

const field = "h-12 w-full rounded-2xl border border-[var(--line)] bg-bg px-4 text-base outline-none focus:border-accent";
const primary = "h-12 w-full rounded-2xl bg-accent text-[0.95rem] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50";

/** /account: passwordless sign in / sign up with an emailed code, then the traveller's profile. */
export function AccountView({ mode, linkExpired, welcome }: { mode: "login" | "signup"; linkExpired: boolean; welcome: boolean }) {
  const account = useAccount();
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5.5rem+env(safe-area-inset-top))] sm:pt-32">
      {account.status === "loading" ? (
        <div className="mt-10 space-y-3">
          <div className="h-10 w-2/3 animate-pulse rounded-xl bg-foam/10" />
          <div className="h-32 animate-pulse rounded-3xl bg-foam/10" />
        </div>
      ) : account.status === "user" && account.profile ? (
        <Profile welcome={welcome} />
      ) : (
        <SignIn initialMode={mode} linkExpired={linkExpired} />
      )}
    </div>
  );
}

function SignIn({ initialMode, linkExpired }: { initialMode: "login" | "signup"; linkExpired: boolean }) {
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(linkExpired ? "Холбоосны хугацаа дууссан байна. Шинэ код аваарай." : null);
  const [wait, setWait] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);
  // Native app with Face ID sign-in turned on earlier
  const [faceId, setFaceId] = useState<string | null>(null);

  useEffect(() => {
    void biometryName().then((name) => setFaceId(name && biometricEnabled("traveller") ? name : null));
  }, []);

  async function viaFaceId() {
    setBusy(true);
    setError(null);
    try {
      await faceIdSignIn();
      haptic("success");
    } catch (err) {
      setError((err as Error).message);
      if (!biometricEnabled("traveller")) setFaceId(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestCode(email.trim());
      setStep("code");
      setWait(60);
      setCode("");
      window.setTimeout(() => codeInput.current?.focus(), 250);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code) {
    if (busy || value.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      await verifyCode(email.trim(), value, mode === "signup" ? name.trim() : undefined);
      haptic("success");
    } catch (err) {
      setError((err as Error).message);
      setCode("");
      haptic("press");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-accent">Elite Travel</p>
      <h1 className="mt-2 font-display text-[2.5rem] font-semibold leading-[0.98] tracking-[-0.035em]">{mode === "signup" ? "Бүртгүүлэх" : "Нэвтрэх"}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Нууц үг хэрэггүй. Имэйлээ оруулахад 6 оронтой код очно. Нэвтэрсний дараа захиалга, чат, төлбөр тань утсаа солисон ч хадгалагдана.
      </p>

      {step === "email" && faceId ? (
        <div className="mt-6">
          <button type="button" disabled={busy} onClick={() => void viaFaceId()} className={`${primary} h-14`}>
            {busy ? "Шалгаж байна…" : `🔐 ${faceId}-аар нэвтрэх`}
          </button>
          <p className="mt-3 text-center text-xs text-muted">эсвэл имэйлээр код авах</p>
        </div>
      ) : null}

      {step === "email" ? (
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-foam/[0.06] p-1">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`h-10 rounded-xl text-sm font-semibold transition ${mode === m ? "bg-bg-elevated text-foam shadow-sm" : "text-muted"}`}
            >
              {m === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}
            </button>
          ))}
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {step === "email" ? (
          <motion.form key="email" onSubmit={send} className="mt-5 space-y-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {mode === "signup" ? (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Таны нэр" autoComplete="name" maxLength={80} className={field} />
            ) : null}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Имэйл хаяг"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              required
              className={field}
            />
            <button type="submit" disabled={busy || !email.includes("@") || (mode === "signup" && name.trim().length < 2)} className={primary}>
              {busy ? "Илгээж байна…" : "Код авах"}
            </button>
          </motion.form>
        ) : (
          <motion.div key="code" className="mt-6 space-y-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <p className="text-sm">
              <b>{email}</b> хаяг руу код илгээлээ. Ирсэн имэйлээ (Spam хавтсыг ч) шалгаарай.
            </p>
            <input
              ref={codeInput}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                setCode(v);
                if (v.length === 6) void verify(v);
              }}
              placeholder="••••••"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={`${field} text-center font-num text-2xl tracking-[0.5em]`}
            />
            <button type="button" disabled={busy || code.length < 6} onClick={() => void verify()} className={primary}>
              {busy ? "Шалгаж байна…" : "Нэвтрэх"}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep("email")} className="font-semibold text-muted">
                ← Имэйл солих
              </button>
              <button type="button" disabled={wait > 0 || busy} onClick={() => void send()} className="font-semibold text-accent disabled:text-muted">
                {wait > 0 ? `Дахин илгээх (${wait})` : "Дахин илгээх"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error ? <p className="mt-4 rounded-2xl bg-[#c2410c]/10 px-4 py-3 text-sm text-[#c2410c]">{error}</p> : null}
      <p className="mt-8 text-center text-xs text-muted">
        Бүртгэлгүйгээр ч захиалж болно —{" "}
        <Link href="/tours" className="font-semibold text-accent">
          аяллууд үзэх
        </Link>
      </p>
    </div>
  );
}

function Profile({ welcome }: { welcome: boolean }) {
  const account = useAccount();
  const profile = account.profile!;
  const { bookings, saved } = useTraveller();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(welcome ? { ok: true, text: "Амжилттай нэвтэрлээ 🎉" } : null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dirty = name !== profile.name || phone !== profile.phone;

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNote(null);
    try {
      await updateProfile({ name, phone });
      setNote({ ok: true, text: "Хадгаллаа ✓" });
    } catch (err) {
      setNote({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0d6e66] text-2xl font-bold text-white">
          {(profile.name || profile.email).charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-[2rem] font-semibold leading-none tracking-[-0.03em]">{profile.name || "Миний бүртгэл"}</h1>
          <p className="mt-1 truncate text-sm text-muted">{profile.email}</p>
        </div>
      </div>

      {note ? <p className={`mt-5 rounded-2xl px-4 py-3 text-sm ${note.ok ? "bg-accent/10 text-accent" : "bg-[#c2410c]/10 text-[#c2410c]"}`}>{note.text}</p> : null}

      <div className="mt-6 grid grid-cols-2 gap-2">
        <Link href="/bookings" className="rounded-2xl border border-[var(--line)] bg-bg-elevated p-4">
          <p className="font-num text-3xl leading-none">{bookings.length}</p>
          <p className="mt-1.5 text-xs text-muted">Захиалга</p>
        </Link>
        <Link href="/bookings" className="rounded-2xl border border-[var(--line)] bg-bg-elevated p-4">
          <p className="font-num text-3xl leading-none">{saved.length}</p>
          <p className="mt-1.5 text-xs text-muted">Хадгалсан аялал</p>
        </Link>
      </div>

      <form onSubmit={save} className="mt-6 space-y-3 rounded-3xl border border-[var(--line)] bg-bg-elevated p-4">
        <p className="text-sm font-semibold">Хувийн мэдээлэл</p>
        <p className="-mt-1 text-xs text-muted">Захиалга хийхэд маягт автоматаар бөглөгдөнө.</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Нэр" autoComplete="name" maxLength={80} className={field} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Утасны дугаар" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} className={field} />
        <button type="submit" disabled={!dirty || saving} className={primary}>
          {saving ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </form>

      <FaceIdCard highlight={welcome} />

      <button
        type="button"
        onClick={() => void logout()}
        className="mt-4 h-12 w-full rounded-2xl border border-[var(--line)] bg-bg-elevated text-sm font-semibold"
      >
        Гарах
      </button>

      <div className="mt-8 rounded-3xl border border-[#c2410c]/25 p-4">
        <p className="text-sm font-semibold text-[#c2410c]">Бүртгэл устгах</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Нэвтрэх эрх болон профайл тань бүрмөсөн устна. Хийсэн захиалга, төлбөр Elite Travel-д хадгалагдсаар байх ба энэ утсан дээрээ харагдсаар байна.
        </p>
        {confirmDelete ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className="h-11 rounded-xl border border-[var(--line)] text-sm font-semibold">
              Болих
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setDeleting(true);
                void disableBiometric("traveller")
                  .then(() => deleteAccount())
                  .catch((err: Error) => setNote({ ok: false, text: err.message }))
                  .finally(() => setDeleting(false));
              }}
              className="h-11 rounded-xl bg-[#c2410c] text-sm font-semibold text-white disabled:opacity-60"
            >
              {deleting ? "…" : "Тийм, устга"}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="mt-3 text-sm font-semibold text-[#c2410c]">
            Бүртгэлээ устгах…
          </button>
        )}
      </div>
    </div>
  );
}

/** Native app only: sign in next time with Face ID instead of an emailed code. */
function FaceIdCard({ highlight }: { highlight: boolean }) {
  const [name, setName] = useState<string | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void biometryName().then((n) => {
      setName(n);
      setOn(biometricEnabled("traveller"));
    });
  }, []);

  if (!name) return null;
  return (
    <div className={`mt-4 rounded-3xl border p-4 ${highlight && !on ? "border-accent bg-accent/[0.06]" : "border-[var(--line)] bg-bg-elevated"}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-xl" aria-hidden>
          🔐
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{name}-аар нэвтрэх</p>
          <p className="text-xs text-muted">{on ? "Дараа нь имэйл код хүлээх шаардлагагүй." : "Дахин нэвтрэхдээ имэйл код хүлээлгүй шууд орно."}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError(null);
            (on ? disableBiometric("traveller") : enableBiometric("traveller"))
              .then(() => {
                setOn(!on);
                if (!on) haptic("success");
              })
              .catch((e: Error) => setError(e.message))
              .finally(() => setBusy(false));
          }}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-accent" : "bg-foam/20"} disabled:opacity-60`}
        >
          <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-[#c2410c]">{error}</p> : null}
    </div>
  );
}
