import { INSTALLMENT_PROVIDERS } from "@/lib/trips";
import Image from "next/image";

/** App icon of a pay-later partner (Pocket, Toki, Simple, Dari). */
export function PartnerLogo({ id, size = 36, className = "" }: { id: string; size?: number; className?: string }) {
  const p = INSTALLMENT_PROVIDERS.find((x) => x.id === id);
  if (!p) return null;
  return (
    <Image
      src={p.logo}
      alt={p.name}
      width={size}
      height={size}
      className={`shrink-0 rounded-[22%] ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
