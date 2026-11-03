import { MobileHome } from "@/components/MobileHome";
import type { Metadata } from "next";

// Reached only through the proxy's rewrite of "/" for phones; the public address is always "/"
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  robots: { index: false },
};

export default function PhoneHomePage() {
  return <MobileHome />;
}
