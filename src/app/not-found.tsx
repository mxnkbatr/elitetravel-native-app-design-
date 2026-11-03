import { Icon } from "@/components/Icon";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Хуудас олдсонгүй", robots: { index: false } };

/** Mistyped or retired links (old tour pages, shared URLs) land somewhere useful instead of a bare 404. */
export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[70dvh] max-w-md place-items-center px-6 pt-[calc(6rem+env(safe-area-inset-top))] text-center">
      <div>
        <p className="font-display text-[5.5rem] font-semibold leading-none tracking-[-0.05em] text-accent/25">404</p>
        <span className="mx-auto -mt-10 grid size-16 place-items-center rounded-[1.4rem] bg-gradient-to-br from-accent to-[#0b6f66] text-white shadow-[0_14px_30px_rgba(14,143,132,0.35)]" aria-hidden>
          <Icon name="compass" size={28} />
        </span>
        <h1 className="type-title mt-5">Энэ зам хаашаа ч хүргэхгүй нь</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Хуудас нүүсэн эсвэл холбоос буруу байж магадгүй. Аяллууд руу ороод шинэ чиглэлээ сонгоорой.
        </p>
        <div className="mt-7 grid gap-2">
          <Link href="/tours" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-white">
            Аяллууд үзэх <Icon name="arrow-right" size={16} />
          </Link>
          <Link href="/" className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--line)] text-sm font-semibold">
            Нүүр хуудас
          </Link>
        </div>
      </div>
    </div>
  );
}
