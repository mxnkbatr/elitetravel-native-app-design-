import { LoginForm } from "@/app/admin/login/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin нэвтрэх",
  robots: { index: false },
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "Elite Admin", statusBarStyle: "default" },
  icons: { apple: "/admin-icon-180.png" },
};

export default function AdminLoginPage() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#062a2a] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(46,196,182,0.22),transparent_55%),radial-gradient(ellipse_at_80%_90%,rgba(232,184,109,0.16),transparent_50%)]" />
      <div className="relative w-full max-w-sm rounded-[1.75rem] border border-white/10 bg-white p-7 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#062a2a] font-display text-xl font-semibold text-[#f3e0c2]">E</span>
          <div>
            <p className="font-display text-xl font-semibold leading-tight text-ink">Elite Travel</p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Admin panel</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
