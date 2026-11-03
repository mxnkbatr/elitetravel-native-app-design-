"use client";

import { addStaff, removeStaff, setStaffRole } from "@/app/admin/(panel)/actions";
import { Sheet } from "@/components/Sheet";
import { titleActionClass } from "@/app/admin/(panel)/AdminTitle";
import { ROLE_HINT, ROLE_LABEL, ROLES, type Role } from "@/lib/permissions";
import { useState, useTransition } from "react";

export type StaffRow = { email: string; name: string | null; role: Role; created_at: string };

const ROLE_TONE: Record<Role, string> = {
  owner: "bg-[#062a2a] text-[#f3e0c2]",
  sales: "bg-sky-100 text-sky-800",
  finance: "bg-emerald-100 text-emerald-800",
  content: "bg-violet-100 text-violet-800",
};

function RolePicker({ value, onChange, disabled }: { value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      {ROLES.map((r) => (
        <button
          key={r}
          type="button"
          disabled={disabled}
          onClick={() => onChange(r)}
          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] disabled:opacity-60 ${
            value === r ? "border-accent bg-accent/[0.06]" : "border-[var(--line)] bg-white"
          }`}
        >
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ROLE_TONE[r]}`}>{ROLE_LABEL[r]}</span>
          <span className="min-w-0 flex-1 text-xs text-muted">{ROLE_HINT[r]}</span>
          {value === r ? <span className="text-accent">✓</span> : null}
        </button>
      ))}
    </div>
  );
}

export function StaffManager({ staff, me }: { staff: StaffRow[]; me: string }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("sales");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function add() {
    setMessage(null);
    start(async () => {
      const res = await addStaff(email, role, name);
      if (!res.ok) return setMessage({ ok: false, text: res.error });
      setAdding(false);
      setEmail("");
      setName("");
      setMessage({ ok: true, text: res.invited ? `${email} руу урилга илгээлээ — имэйлээрээ нууц үгээ тохируулна.` : (res.note ?? "Нэмэгдлээ.") });
    });
  }

  function changeRole(row: StaffRow, next: Role) {
    if (next === row.role) return;
    setMessage(null);
    start(async () => {
      const res = await setStaffRole(row.email, next);
      setMessage(res.ok ? { ok: true, text: `${row.email} → ${ROLE_LABEL[next]}` } : { ok: false, text: res.error });
      if (res.ok) setEditing(null);
    });
  }

  function remove(row: StaffRow) {
    if (!window.confirm(`${row.email}-ийг админ эрхээс хасах уу?`)) return;
    setMessage(null);
    start(async () => {
      const res = await removeStaff(row.email);
      setMessage(res.ok ? { ok: true, text: "Хасагдлаа." } : { ok: false, text: res.error });
      if (res.ok) setEditing(null);
    });
  }

  const input = "mt-1 block h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm text-ink outline-none focus:border-accent";

  return (
    <div className="mt-5">
      <button type="button" onClick={() => setAdding(true)} className={titleActionClass}>
        + Ажилтан нэмэх
      </button>
      {message ? <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.text}</p> : null}

      <div className="mt-4 space-y-2">
        {staff.map((s) => (
          <button
            key={s.email}
            type="button"
            onClick={() => s.email !== me && setEditing(s)}
            className="flex w-full items-center gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white p-3.5 text-left transition active:scale-[0.99]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#062a2a] font-semibold text-[#f3e0c2]">{(s.name || s.email).charAt(0).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{s.name || s.email}</span>
              <span className="block truncate text-xs text-muted">
                {s.name ? s.email : null}
                {s.email === me ? " (та)" : ""}
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${ROLE_TONE[s.role]}`}>{ROLE_LABEL[s.role]}</span>
            {s.email !== me ? <span className="text-muted">›</span> : null}
          </button>
        ))}
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Ажилтан нэмэх">
        <div className="space-y-3 pb-2">
          <label className="block text-xs font-semibold text-muted">
            Имэйл
            <input type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@elitetravel.mn" className={input} />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Нэр (заавал биш)
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={input} />
          </label>
          <p className="pt-1 text-xs font-semibold text-muted">Үүрэг</p>
          <RolePicker value={role} onChange={setRole} />
          <button type="button" disabled={pending || !email.trim()} onClick={add} className="mt-2 h-12 w-full rounded-full bg-accent text-sm font-semibold text-white disabled:opacity-50">
            {pending ? "Нэмж байна…" : "Нэмэх, урилга илгээх"}
          </button>
          <p className="text-[0.7rem] leading-relaxed text-muted">Нэвтрэх бүртгэлгүй бол имэйлээр нь урилга очиж, нууц үгээ өөрөө тохируулна.</p>
        </div>
      </Sheet>

      <Sheet open={editing != null} onClose={() => setEditing(null)} title={editing?.name || editing?.email}>
        {editing ? (
          <div className="space-y-3 pb-2">
            <RolePicker value={editing.role} onChange={(r) => changeRole(editing, r)} disabled={pending} />
            <button type="button" disabled={pending} onClick={() => remove(editing)} className="mt-2 h-11 w-full rounded-full border border-red-200 text-sm font-semibold text-red-600 disabled:opacity-50">
              Админ эрхээс хасах
            </button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
