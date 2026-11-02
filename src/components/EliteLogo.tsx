import Link from "next/link";

type EliteLogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg" | "hero";
  showWordmark?: boolean;
  light?: boolean;
  className?: string;
};

const sizes = {
  sm: { mark: 30, elite: "text-[1.05rem]", travel: "text-[0.5rem]", gap: "gap-2" },
  md: { mark: 38, elite: "text-[1.25rem]", travel: "text-[0.54rem]", gap: "gap-2.5" },
  lg: { mark: 50, elite: "text-[1.6rem]", travel: "text-[0.6rem]", gap: "gap-3" },
  hero: { mark: 64, elite: "text-[2rem]", travel: "text-[0.66rem]", gap: "gap-3.5" },
};

/** Brand mark: serif E crossed by a flight swoosh, plane climbing off the top arm. */
function Mark({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="shrink-0" aria-hidden>
      {/* Serif E */}
      <path
        fill={color}
        d="M14 9h30.5l.9 9.2h-1.4C42.6 13 40.4 11.6 35 11.6H26.2v18.1h6.6c4.5 0 5.6-1.3 6.2-5.3h1.4v13.4H39c-.6-4.1-1.7-5.4-6.2-5.4h-6.6v17.9c0 2.6.9 3.2 3.6 3.2h6.3c6 0 8.3-1.9 10.5-8.1h1.4L46.6 55H14v-1.3c3.7-.4 4.4-1.1 4.4-4.6V14.9c0-3.5-.7-4.2-4.4-4.6Z"
      />
      {/* Swoosh crossing the stem */}
      <path
        fill={color}
        d="M8 47.5C17 37.6 30.6 30.6 50.6 27.4c-17.8 4.4-30 10.8-40.6 21.6Z"
      />
      {/* Plane */}
      <g transform="translate(53.6 22.4) rotate(-32)">
        <path
          fill={color}
          d="M-5.6-.7 2.6-1l3-3.6h1.3L5.2-1.1 7.6-1.2c.9 0 .9 2.4 0 2.4l-2.4-.1L6.9 4.6H5.6l-3-3.6-8.2-.3c-.7-.1-.7-1.3 0-1.4Zm-1.2-2.1h1l1.3 1.6-1.3.1Zm0 5.6.9-1.7 1.3.1-1.2 1.6Z"
        />
      </g>
    </svg>
  );
}

export function EliteLogo({
  href = "/",
  size = "md",
  showWordmark = true,
  light = false,
  className = "",
}: EliteLogoProps) {
  const s = sizes[size];
  // Sage on deep green, as in the brand artwork; forest green on light pages
  const color = light ? "#c4d6bd" : "#123f30";
  const sub = light ? "#a9c2a3" : "#4f7363";

  const inner = (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <Mark size={s.mark} color={color} />
      {showWordmark ? (
        <span className="flex flex-col items-center justify-center leading-none">
          <span className={`font-brand font-semibold uppercase tracking-[0.32em] ${s.elite}`} style={{ color }}>
            Elite
          </span>{" "}
          <span className={`font-brand mt-[0.45em] flex items-center gap-[0.5em] uppercase tracking-[0.42em] ${s.travel}`} style={{ color: sub }}>
            <span className="h-px w-[1.2em]" style={{ background: sub }} />
            Travel
            <span className="-ml-[0.42em] h-px w-[1.2em]" style={{ background: sub }} />
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="inline-flex items-center" aria-label={showWordmark ? undefined : "Elite Travel"}>
      {inner}
    </Link>
  );
}
