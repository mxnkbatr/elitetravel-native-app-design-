import { AdminShell } from "@/app/admin/(panel)/AdminShell";
import { logout } from "@/app/admin/login/actions";
import { requireAdmin } from "@/lib/server/auth";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "Elite Admin", statusBarStyle: "default" },
  icons: { apple: "/admin-icon-180.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eef5f2",
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  return (
    <AdminShell email={admin.email} role={admin.role} logout={logout}>
      {children}
    </AdminShell>
  );
}
