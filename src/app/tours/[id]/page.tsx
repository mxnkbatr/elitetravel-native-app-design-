import { TourDetailView } from "@/components/TourDetailView";
import { getTour, isBookable, tourDates, type Tour } from "@/data/tours";
import { getTours } from "@/lib/server/content";
import { jsonLd, siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  const tours = await getTours();
  return tours.map((t) => ({ id: t.id }));
}

const absolute = (src: string) => (src.startsWith("/") ? `${siteUrl()}${src}` : src);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tour = getTour(await getTours(), id);
  if (!tour) return { title: "Аялал" };
  return {
    title: tour.title,
    description: tour.description,
    alternates: { canonical: `/tours/${tour.id}` },
    // Ended departures stay reachable by link but drop out of search
    robots: tour.status === "ended" ? { index: false } : undefined,
    openGraph: { type: "website", title: tour.title, description: tour.description, images: [{ url: absolute(tour.image) }] },
  };
}

/** schema.org TouristTrip with its price, plus breadcrumbs, so search results can show price and dates. */
function structuredData(tour: Tour) {
  const url = `${siteUrl()}/tours/${tour.id}`;
  const trip = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: tour.title,
    description: tour.description,
    url,
    image: [tour.image, ...tour.gallery].map(absolute).slice(0, 6),
    touristType: tour.destination,
    provider: { "@type": "TravelAgency", name: "Elite Travel Mongolia", url: siteUrl(), telephone: "+976 9003 1771" },
    itinerary: tour.itinerary.length
      ? {
          "@type": "ItemList",
          itemListElement: tour.itinerary.map((d, i) => ({ "@type": "ListItem", position: i + 1, name: `${d.day}: ${d.title}`, description: d.detail })),
        }
      : undefined,
    offers:
      tour.price != null
        ? {
            "@type": "Offer",
            price: tour.price,
            priceCurrency: "MNT",
            url,
            availability: isBookable(tour) ? "https://schema.org/InStock" : tour.tag === "soon" ? "https://schema.org/PreOrder" : "https://schema.org/SoldOut",
            description: [tour.duration, ...tourDates(tour)].join(" · "),
          }
        : undefined,
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Нүүр", item: siteUrl() },
      { "@type": "ListItem", position: 2, name: "Аяллууд", item: `${siteUrl()}/tours` },
      { "@type": "ListItem", position: 3, name: tour.title, item: url },
    ],
  };
  return [trip, breadcrumbs];
}

export default async function TourDetailPage({ params }: Props) {
  const { id } = await params;
  const tour = getTour(await getTours(), id);
  if (!tour) notFound();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData(tour)) }} />
      <TourDetailView tour={tour} />
    </>
  );
}
