import { AccountView } from "@/components/AccountView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Миний бүртгэл",
  description: "Нууц үггүйгээр имэйлээр нэвтэрч, захиалгаа бүх төхөөрөмж дээрээ хадгална.",
  robots: { index: false },
};

export default async function AccountRoute({ searchParams }: PageProps<"/account">) {
  const { mode, link, welcome } = await searchParams;
  return <AccountView mode={mode === "signup" ? "signup" : "login"} linkExpired={link === "expired"} welcome={welcome === "1"} />;
}
