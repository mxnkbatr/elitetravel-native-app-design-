import { AppShell } from "@/components/AppShell";
import { toSummary } from "@/data/tours";
import { ContentProvider } from "@/lib/content";
import { introBootScript } from "@/lib/intro";
import { chatModel } from "@/lib/server/ai";
import { jsonLd, siteUrl } from "@/lib/site";
import { themeBootScript } from "@/lib/theme";
import { getNews, getTours } from "@/lib/server/content";
import { getSeats } from "@/lib/server/seats";
import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  // cyrillic-ext carries the Mongolian letters ү and ө
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

// Body text needs full Mongolian Cyrillic (ү, ө); DM Sans had none, so letters fell back to mixed system fonts
const body = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
});

const description =
  "Хайнань, Хонг Конг, Бали болон концерт аяллууд — халуун орны тансаг амралтыг Elite Travel Mongolia-тай.";

export const metadata: Metadata = {
  title: {
    default: "Elite Travel Mongolia | Explore. Dream. Discover.",
    template: "%s · Elite Travel",
  },
  description,
  metadataBase: new URL(siteUrl()),
  openGraph: {
    type: "website",
    locale: "mn_MN",
    siteName: "Elite Travel Mongolia",
    title: "Elite Travel Mongolia — Халуун орны тансаг аялал",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Elite Travel Mongolia — Халуун орны тансаг аялал",
    description,
  },
};

/** The company card search engines show next to results (schema.org TravelAgency). */
const organization = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: "Elite Travel Mongolia",
  alternateName: "Элит Трэвел",
  url: siteUrl(),
  logo: `${siteUrl()}/admin-icon-512.png`,
  telephone: "+976 9003 1771",
  description,
  address: { "@type": "PostalAddress", addressLocality: "Улаанбаатар", addressCountry: "MN" },
  sameAs: ["https://www.instagram.com/elitetravelmn"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eef5f2",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [tours, news, seats] = await Promise.all([getTours(), getNews(), getSeats()]);
  return (
    <html lang="mn" className={`${display.variable} ${body.variable} h-full`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} />
      </head>
      <body className="min-h-full bg-bg font-sans text-foam antialiased">
        <ContentProvider tours={tours.filter((t) => !t.unlisted).map(toSummary)} news={news} seats={seats}>
          <AppShell assistant={chatModel() != null}>{children}</AppShell>
        </ContentProvider>
      </body>
    </html>
  );
}
