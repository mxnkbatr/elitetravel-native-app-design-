"use client";

import type { NewsItem } from "@/data/news";
import type { TourSummary } from "@/data/tours";
import type { SeatMap } from "@/lib/trips";
import { createContext, useContext, type ReactNode } from "react";

type Content = { tours: TourSummary[]; news: NewsItem[]; seats: SeatMap };

const ContentContext = createContext<Content>({ tours: [], news: [], seats: {} });

/** Tours, news and seat availability from the database, loaded once in the root layout and shared with client components. */
export function ContentProvider({ tours, news, seats, children }: Content & { children: ReactNode }) {
  return <ContentContext.Provider value={{ tours, news, seats }}>{children}</ContentContext.Provider>;
}

export function useTours() {
  return useContext(ContentContext).tours;
}

export function useNews() {
  return useContext(ContentContext).news;
}

/** Seats left per date label for a tour; missing labels are not tracked. */
export function useSeats(tourId: string) {
  return useContext(ContentContext).seats[tourId] ?? {};
}
