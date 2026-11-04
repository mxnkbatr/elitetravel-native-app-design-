import { MapExplorer } from "@/components/MapExplorer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Газрын зураг",
  description: "Elite Travel-ийн бүх чиглэл газрын зураг дээр — цэг дээр дарж аяллаа сонгоорой.",
};

export default function MapRoute() {
  return (
    <>
      {/* The map is the page; screen readers still get a heading to land on */}
      <h1 className="sr-only">Газрын зураг</h1>
      <MapExplorer />
    </>
  );
}
