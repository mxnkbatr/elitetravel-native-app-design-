import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { MobileTours } from "@/components/MobileTours";
import { Tours } from "@/components/Tours";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Аяллууд",
  description: "Elite Travel-ийн эрэлттэй болон удахгүй гарах аяллууд.",
};

type ToursPageProps = {
  searchParams: Promise<{ dest?: string }>;
};

export default async function ToursPage({ searchParams }: ToursPageProps) {
  const params = await searchParams;

  return (
    <Section className="page-pad-top space-y-6 pb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PageHeader
          eyebrow="Tours"
          title="Эрэлттэй аяллууд"
          description="Концерт, далайн амралт, хотын аялал — танд тохирохыг нь сонгоорой."
        />
      </div>
      <div className="px-4 sm:hidden">
        <MobileTours initialFilter={params.dest ?? "all"} />
      </div>
      <div className="hidden sm:block">
        <Tours showHeader={false} initialFilter={params.dest ?? "all"} />
      </div>
    </Section>
  );
}
