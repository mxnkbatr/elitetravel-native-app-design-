import { AppShell } from "@/components/AppShell";
import { ContentProvider } from "@/lib/content";
import { introBootScript } from "@/lib/intro";
import { chatModel } from "@/lib/server/ai";
import { getNews, getTours } from "@/lib/server/content";
import { getSeats } from "@/lib/server/seats";
import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const body = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
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
  metadataBase: new URL("https://elitetravel.mn"),
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
      </head>
      <body className="min-h-full bg-bg font-sans text-foam antialiased">
        <ContentProvider tours={tours} news={news} seats={seats}>
          <AppShell assistant={chatModel() != null}>{children}</AppShell>
        </ContentProvider>
      </body>
    </html>
  );
}
