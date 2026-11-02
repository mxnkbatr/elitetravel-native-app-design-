"use client";

import { login, type LoginState } from "@/app/admin/login/actions";
import { biometricEnabled, biometricSignIn, biometryName } from "@/lib/biometric";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

const field = "h-12 w-full rounded-xl border border-[var(--line)] bg-bg px-4 text-base text-ink outline-none transition focus:border-accent sm:text-sm";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const router = useRouter();
  // In the app, once a staff member turned it on from the menu
  const [faceId, setFaceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void biometryName().then((name) => setFaceId(name && biometricEnabled("staff") ? name : null));
  }, []);

  return (
    <form action={action} className="space-y-3">
      {faceId ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              biometricSignIn("staff")
                .then(() => {
                  router.replace("/admin");
                  router.refresh();
                })
                .catch((e: Error) => {
                  setError(e.message);
                  setBusy(false);
                });
            }}
            className="h-14 w-full rounded-xl bg-accent text-sm font-semibold text-white transition disabled:opacity-60"
          >
            {busy ? "Шалгаж байна…" : `🔐 ${faceId}-аар нэвтрэх`}
          </button>
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <p className="pt-1 text-center text-xs text-muted">эсвэл имэйл, нууц үгээр</p>
        </>
      ) : null}
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-muted">Имэйл</span>
        <input name="email" type="email" autoComplete="username" required className={field} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-muted">Нууц үг</span>
        <input name="password" type="password" autoComplete="current-password" required className={field} />
      </label>
      {state.error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-12 w-full rounded-xl bg-ink text-sm font-semibold text-white transition hover:bg-accent disabled:opacity-60"
      >
        {pending ? "Шалгаж байна…" : "Нэвтрэх"}
      </button>
    </form>
  );
}
