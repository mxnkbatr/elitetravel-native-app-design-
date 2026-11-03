"use client";

import { Icon } from "@/components/Icon";
import { enablePush, pushState, type PushState } from "@/lib/push-client";
import { useEffect, useState } from "react";

/** In the native app, invites the traveller to turn on push for chat, payments and trip reminders. */
export function PushPrompt() {
  const [state, setState] = useState<PushState>("unavailable");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void pushState().then(setState);
  }, []);

  if (state === "unavailable" || state === "granted") return null;

  if (state === "denied") {
    return (
      <p className="rounded-2xl bg-bg-elevated px-4 py-3 text-xs text-muted">
        <Icon name="bell-off" size={14} className="inline -mt-0.5 mr-1" />
        Мэдэгдэл унтраастай байна. Асаах бол утасныхаа <b>Тохиргоо → Elite Travel → Мэдэгдэл</b> хэсгийг нээнэ үү.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-[1.4rem] border border-accent/25 bg-accent-mist/60 p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-white" aria-hidden>
        <Icon name="bell" size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Мэдэгдэл асаах</p>
        <p className="text-xs text-muted">Хариу, төлбөр, аяллын сануулгыг утсандаа шууд авна.</p>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void enablePush()
            .then(setState)
            .finally(() => setBusy(false));
        }}
        className="h-10 shrink-0 rounded-full bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "…" : "Асаах"}
      </button>
    </div>
  );
}
