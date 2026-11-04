"use client";

import { AiHelper } from "@/components/AiHelper";
import { AppOnboarding } from "@/components/AppOnboarding";
import { Footer } from "@/components/Footer";
import { ImageLoadMarker } from "@/components/ImageLoadMarker";
import { IntroCurtain } from "@/components/IntroCurtain";
import { MobileDock } from "@/components/MobileDock";
import { NativeReady } from "@/components/NativeReady";
import { Navbar } from "@/components/Navbar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PageTracker } from "@/components/PageTracker";
import { PageTransition } from "@/components/PageTransition";
import { PushBridge } from "@/components/PushBridge";
import { ScrollProgress } from "@/components/ScrollProgress";
import { SearchOverlay } from "@/components/SearchOverlay";
import { SmoothScroll } from "@/components/SmoothScroll";
import { TourPreload } from "@/components/TourPreload";
import type { AssistantPublic } from "@/lib/assistant-settings";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** `assistant` is null when no AI model is configured or staff switched it off in /admin/assistant: no chat button. */
export function AppShell({ children, assistant }: { children: ReactNode; assistant: AssistantPublic | null }) {
  // The staff panel has its own chrome and skips the intro, nav and chat
  if (usePathname().startsWith("/admin"))
    return (
      <>
        <NativeReady />
        <PushBridge />
        {children}
      </>
    );

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* First Tab stop: jump past the navigation straight to the page */}
      <a
        href="#main"
        className="fixed left-3 top-3 z-[200] -translate-y-24 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white focus-visible:translate-y-0"
      >
        Үндсэн агуулга руу шилжих
      </a>
      <NativeReady />
      <AppOnboarding />
      <PushBridge />
      <PageTracker />
      <TourPreload />
      <IntroCurtain />
      <SmoothScroll />
      <ImageLoadMarker />
      <ScrollProgress />
      <Navbar />
      <main id="main" tabIndex={-1} className="app-main flex-1 outline-none">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <MobileDock />
      <SearchOverlay />
      <OfflineBanner />
      {assistant ? <AiHelper settings={assistant} /> : null}
    </div>
  );
}
