import { EliteLogo } from "@/components/EliteLogo";
import { destinations } from "@/data/tours";
import Link from "next/link";

const explore = [
  { href: "/tours", label: "Бүх аялал" },
  { href: "/map", label: "Газрын зураг" },
  { href: "/news", label: "Мэдээ мэдээлэл" },
  { href: "/resorts", label: "Амралтын газрууд" },
  { href: "/about", label: "Бидний тухай" },
];

const contact = [
  { href: "tel:+97690031771", label: "+976 9003 1771" },
  { href: "tel:+97690032772", label: "+976 9003 2772" },
  { href: "https://www.instagram.com/elitetravelmn/", label: "Instagram · @elitetravelmn" },
  { href: "/bookings", label: "Миний захиалга" },
];

export function Footer() {
  return (
    <footer className="site-footer relative overflow-hidden bg-[#062a2a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_0%,rgba(46, 196, 182,0.18),transparent_50%),radial-gradient(ellipse_at_100%_100%,rgba(232, 184, 109,0.14),transparent_45%)]" />

      <div className="relative mx-auto max-w-6xl px-4 pb-[calc(2.5rem+var(--dock-h))] pt-16 sm:px-6 sm:pt-20">
        <div className="flex flex-col gap-8 border-b border-white/10 pb-12 md:flex-row md:items-end md:justify-between">
          <h2 className="max-w-lg font-display text-[clamp(2.2rem,5vw,3.75rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            Дараагийн аялал тань <span className="italic text-[#e8b86d]">эндээс</span> эхэлнэ.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/tours"
              className="btn-shine inline-flex h-12 items-center rounded-full bg-[#e8b86d] px-6 text-sm font-semibold text-ink"
            >
              Аяллууд үзэх →
            </Link>
            <a
              href="tel:+97690031771"
              className="inline-flex h-12 items-center rounded-full border border-white/25 px-6 text-sm font-medium transition hover:bg-white/10"
            >
              Залгах
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <EliteLogo size="md" light />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Халуун орны далайн амралт, концерт аялал, хотын аялал — Улаанбаатараас бүрэн багцаар.
            </p>
          </div>

          <FooterCol title="Аялах">
            {explore.map((l) => (
              <FooterLink key={l.href} href={l.href}>
                {l.label}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Чиглэл">
            {destinations.map((d) => (
              <FooterLink key={d.key} href={`/tours?dest=${d.key}`}>
                {d.name}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Холбогдох">
            {contact.map((l) => (
              <FooterLink key={l.href} href={l.href}>
                {l.label}
              </FooterLink>
            ))}
          </FooterCol>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Elite Travel Mongolia. Бүх эрх хуулиар хамгаалагдсан.</p>
          <p className="tracking-[0.2em] uppercase">Explore · Dream · Discover</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[#7ef0e0]">{title}</p>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  return (
    <li>
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="text-sm text-white/75 transition hover:text-white"
      >
        {children}
      </Link>
    </li>
  );
}
