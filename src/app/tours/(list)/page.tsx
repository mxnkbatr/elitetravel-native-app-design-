import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { ToursLists, ToursListsFromUrl } from "@/components/ToursLists";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Аяллууд",
  description: "Elite Travel-ийн эрэлттэй болон удахгүй гарах аяллууд.",
};

export default function ToursPage() {
  return (
    <Section className="page-pad-top space-y-6 pb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PageHeader
          eyebrow="Tours"
          title="Эрэлттэй аяллууд"
          description="Концерт, далайн амралт, хотын аялал — танд тохирохыг нь сонгоорой."
        />
      </div>
      {/* Static page: the prerendered lists show every tour; ?dest= picks its chip in the browser */}
      <Suspense fallback={<ToursLists />}>
        <ToursListsFromUrl />
      </Suspense>
    </Section>
  );
}
