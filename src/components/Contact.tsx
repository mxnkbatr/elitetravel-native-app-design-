const channels = [
  {
    label: "Утас",
    value: "+976 9003 1771",
    hint: "Эсвэл +976 9003 2772",
    href: "tel:+97690031771",
  },
  {
    label: "Instagram",
    value: "@elitetravelmn",
    hint: "DM-ээр аялал асуух",
    href: "https://www.instagram.com/elitetravelmn/",
  },
  {
    label: "Вэб",
    value: "elitetravel.mn",
    hint: "Бүх аялал, огноо, үнэ",
    href: "https://elitetravel.mn",
  },
];

export function Contact() {
  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      {channels.map((c) => (
        <a
          key={c.label}
          href={c.href}
          target={c.href.startsWith("http") ? "_blank" : undefined}
          rel={c.href.startsWith("http") ? "noreferrer" : undefined}
          className="group flex items-center justify-between gap-4 rounded-[1.25rem] border border-[var(--line)] bg-bg-elevated p-5 transition duration-500 hover:-translate-y-1 hover:border-transparent hover:bg-[#062a2a] hover:text-white sm:flex-col sm:items-start sm:p-7"
        >
          <div>
            <p className="type-eyebrow text-accent group-hover:text-[#7ef0e0]">
              {c.label}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em]">{c.value}</p>
            <p className="mt-1 text-sm text-muted group-hover:text-white/60">{c.hint}</p>
          </div>
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--line)] transition group-hover:rotate-[-45deg] group-hover:border-white/30 sm:mt-6"
          >
            →
          </span>
        </a>
      ))}
    </div>
  );
}
