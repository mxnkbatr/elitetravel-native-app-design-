"use client";

import { EliteLogo } from "@/components/EliteLogo";
import { deleteAccount, faceIdSignIn, logout, requestCode, updateProfile, useAccount, verifyCode } from "@/lib/account";
import { biometricEnabled, biometryName, disableBiometric, enableBiometric } from "@/lib/biometric";
import { cldImage } from "@/lib/cloudinary";
import { haptic } from "@/lib/native";
import { useTraveller } from "@/lib/traveller-store";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

const SIGN_IN_PHOTO = "elitetravel/tours/tropical-aerial-coast";

const field = "h-12 w-full rounded-2xl border border-[var(--line)] bg-bg px-4 text-base outline-none focus:border-accent";
const primary = "h-12 w-full rounded-2xl bg-accent text-[0.95rem] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50";

/** /account: passwordless sign in / sign up with an emailed code, then the traveller's profile. */
export function AccountView({ mode, linkExpired, welcome }: { mode: "login" | "signup"; linkExpired: boolean; welcome: boolean }) {
  const account = useAccount();
  if (account.status === "guest") return <SignIn initialMode={mode} linkExpired={linkExpired} />;
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5.5rem+env(safe-area-inset-top))] sm:pt-32">
      {account.status === "user" && account.profile ? (
        <Profile welcome={welcome} />
      ) : (
        <div className="mt-10 space-y-3">
          <div className="h-10 w-2/3 animate-pulse rounded-xl bg-foam/10" />
          <div className="h-32 animate-pulse rounded-3xl bg-foam/10" />
        </div>
      )}
    </div>
  );
}

/** Full-screen sign-in, like a native app's: photo and logo on top, the form in a sheet below. */
function SignInScreen({ children }: { children: ReactNode }) {
  const router = useRouter();
  const close = () => {
    haptic("tap");
    if (window.history.length > 1) router.back();
    else router.push("/");
  };
  // Portaled: the page transition wrapper would otherwise keep it under the header, dock and chat button
  return createPortal(
    <div className="fixed inset-0 z-[85] overflow-y-auto overscroll-contain bg-[#062a2a]" data-lenis-prevent>
      <div className="absolute inset-x-0 top-0 h-[46svh] sm:fixed sm:inset-0 sm:h-auto">
        <Image src={cldImage(SIGN_IN_PHOTO)} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#031a1a]/55 via-[#062a2a]/20 to-[#062a2a]/85 sm:to-[#062a2a]/70" />
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Хаах"
        className="fixed left-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 grid size-10 place-items-center rounded-full bg-black/25 text-xl text-white backdrop-blur-md active:scale-90"
      >
        ×
      </button>
      <div className="relative flex min-h-full flex-col sm:items-center sm:justify-center sm:p-6">
        <div className="flex h-[38svh] min-h-[220px] shrink-0 flex-col items-center justify-end pb-10 text-center sm:h-auto sm:min-h-0 sm:pb-8">
          <EliteLogo href="" size="lg" light />
          <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-white/70">Explore · Dream · Discover</p>
        </div>
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          className="relative -mt-6 flex-1 rounded-t-[2rem] bg-bg-elevated px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-7 text-foam shadow-[0_-20px_60px_rgba(0,0,0,0.25)] sm:mt-0 sm:w-full sm:max-w-md sm:flex-none sm:rounded-[2rem] sm:pb-7"
        >
          {children}
        </motion.div>
      </div>
    </div>,
    document.body,
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
    <SignInScreen>
      <h1 className="font-display text-[2.1rem] font-semibold leading-[1] tracking-[-0.035em]">{mode === "signup" ? "Бүртгүүлэх" : "Тавтай морил 👋"}</h1>
      <p className="mt-2.5 text-sm leading-relaxed text-muted">
        {mode === "signup"
          ? "Нууц үг хэрэггүй — имэйлээр тань 6 оронтой код очно. Захиалга, чат, төлбөр тань бүх төхөөрөмж дээр хадгалагдана."
          : "Имэйлээ оруулаад ирсэн кодоор нэвтэрнэ. Захиалга, чат, төлбөр тань утсаа солисон ч хадгалагдана."}
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
      <div className="mt-7 border-t border-[var(--line)] pt-5 text-center">
        <Link href="/tours" className="text-sm font-semibold text-accent">
          Бүртгэлгүйгээр үргэлжлүүлэх →
        </Link>
        <p className="mt-2 text-xs text-muted">
          Асуух зүйл байвал{" "}
          <a href="tel:+97690031771" className="font-semibold text-foam/80">
            +976 9003 1771
          </a>
        </p>
      </div>
    </SignInScreen>
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
