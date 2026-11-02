"use client";

import { AiHelper } from "@/components/AiHelper";
import { AppOnboarding } from "@/components/AppOnboarding";
import { Footer } from "@/components/Footer";
import { ImageLoadMarker } from "@/components/ImageLoadMarker";
import { IntroCurtain } from "@/components/IntroCurtain";
import { MobileDock } from "@/components/MobileDock";
import { NativeReady } from "@/components/NativeReady";
import { Navbar } from "@/components/Navbar";
import { PageTracker } from "@/components/PageTracker";
import { PageTransition } from "@/components/PageTransition";
import { PushBridge } from "@/components/PushBridge";
import { ScrollProgress } from "@/components/ScrollProgress";
import { SearchOverlay } from "@/components/SearchOverlay";
import { SmoothScroll } from "@/components/SmoothScroll";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** `assistant` is false when no AI model is configured on the server: the chat button stays hidden. */
export function AppShell({ children, assistant }: { children: ReactNode; assistant: boolean }) {
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
      <NativeReady />
      <AppOnboarding />
      <PushBridge />
      <PageTracker />
      <IntroCurtain />
      <SmoothScroll />
      <ImageLoadMarker />
      <ScrollProgress />
      <Navbar />
      <main className="app-main flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <MobileDock />
      <SearchOverlay />
      {assistant ? <AiHelper /> : null}
    </div>
  );
}
