"use client";

import { biometricEnabled, biometryName, disableBiometric, enableBiometric } from "@/lib/biometric";
import { useEffect, useState } from "react";

/** In the native app: turn Face ID sign-in to /admin on or off for this phone. */
export function StaffFaceId() {
  const [name, setName] = useState<string | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void biometryName().then((n) => {
      setName(n);
      setOn(biometricEnabled("staff"));
    });
  }, []);

  if (!name) return null;
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          (on ? disableBiometric("staff") : enableBiometric("staff"))
            .then(() => setOn(!on))
            .catch((e: Error) => setError(e.message))
            .finally(() => setBusy(false));
        }}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-ink disabled:opacity-60"
      >
        <span aria-hidden>🔐</span>
        <span className="flex-1">{name}-аар нэвтрэх</span>
        <span className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${on ? "bg-accent/15 text-accent" : "bg-black/[0.06] text-muted"}`}>{busy ? "…" : on ? "Асаалттай" : "Унтраалттай"}</span>
      </button>
      {error ? <p className="px-4 pb-3 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
