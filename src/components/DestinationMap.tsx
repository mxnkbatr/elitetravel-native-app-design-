"use client";

import { destinations, formatPrice, isBookable, type TourSummary } from "@/data/tours";
import { withTransforms } from "@/lib/cloudinary";
import { useTours } from "@/lib/content";
import type { LngLatLike, Map as MapLibre, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef } from "react";

/** Free, keyless vector tiles — no origin allow-list to break in production. */
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

const HUB = { key: "ub", name: "Улаанбаатар", lng: 106.917, lat: 47.918 };

const coords: Record<string, [number, number]> = {
  hainan: [109.508, 18.247],
  hongkong: [114.1694, 22.3193],
  bali: [115.1889, -8.4095],
  egypt: [31.2357, 30.0444],
};

const buildPins = (tours: TourSummary[]) =>
  destinations.map((d) => {
  const open = tours.filter((t) => isBookable(t) && t.destinationKey === d.key);
  const from = open.reduce<number | null>((m, t) => (t.price && (!m || t.price < m) ? t.price : m), null);
  return {
    key: d.key,
    name: d.name,
    lng: coords[d.key][0],
    lat: coords[d.key][1],
    photo: withTransforms(d.image, "f_auto,q_auto,c_fill,g_auto,w_120,h_120"),
    label: from ? `${formatPrice(from)}-аас` : "Удахгүй",
  };
});

/** Quadratic bezier from UB, bowed sideways so routes read as flight arcs. */
function arc(to: [number, number], steps = 64): [number, number][] {
  const [x0, y0] = [HUB.lng, HUB.lat];
  const [x2, y2] = to;
  const dx = x2 - x0;
  const dy = y2 - y0;
  const len = Math.hypot(dx, dy);
  const bow = Math.min(18, len * 0.28);
  const [cx, cy] = [(x0 + x2) / 2 - (dy / len) * bow, (y0 + y2) / 2 + (dx / len) * bow];
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return [u * u * x0 + 2 * u * t * cx + t * t * x2, u * u * y0 + 2 * u * t * cy + t * t * y2];
  });
}

const routes = Object.fromEntries(destinations.map((d) => [d.key, arc(coords[d.key])]));

const PLANE_SVG = `<svg width="26" height="26" viewBox="0 0 24 24" fill="#0a2a26"><path d="M21 15.5v-1.8l-8-5V3.6a1.6 1.6 0 0 0-3.2 0v5.1l-8 5v1.8l8-2.5v4.6l-2.2 1.7V21l3.8-1.1 3.8 1.1v-1.7l-2.2-1.7V13l8 2.5Z"/></svg>`;

type DestinationMapProps = {
  active: string;
  onSelect: (key: string) => void;
  /** Bottom space covered by overlays (e.g. the phone card), so flights frame above it */
  bottomInset?: number;
  fullscreen?: boolean;
};

export function DestinationMap({ active, onSelect, bottomInset = 0, fullscreen = true }: DestinationMapProps) {
  const tours = useTours();
  const pins = useMemo(() => buildPins(tours), [tours]);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const pinEls = useRef<Record<string, HTMLElement>>({});
  const planeRef = useRef<Marker | null>(null);
  const rafRef = useRef(0);
  const readyRef = useRef(false);
  const activeRef = useRef(active);
  const onSelectRef = useRef(onSelect);
  const insetRef = useRef(bottomInset);

  useEffect(() => {
    onSelectRef.current = onSelect;
    insetRef.current = bottomInset;
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    // ~1 MB, loaded with the map itself so link prefetches to /map stay light
    void import("maplibre-gl").then(({ Map, Marker, NavigationControl, setWorkerUrl }) => {
      if (cancelled || !containerRef.current) return;
      // Turbopack does not emit maplibre v6's worker chunk; serve the copy from public/ (see postinstall)
      setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const map = new Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: [98, 32],
        zoom: 0.8,
        attributionControl: { compact: true },
        renderWorldCopies: false,
        // Phones have 2–3× screens; drawing every vector tile at full density is what stutters
        pixelRatio: Math.min(window.devicePixelRatio || 1, window.matchMedia("(max-width: 639px)").matches ? 1.5 : 2),
        fadeDuration: 0,
      });
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      mapRef.current = map;

      map.on("load", () => {
        // Brand tint: sea in the site's pale teal, land in warm off-white
        if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", "#cfe8e3");
        if (map.getLayer("background")) map.setPaintProperty("background", "background-color", "#f5f7f2");
        // One clean label per place: Mongolian where OSM has it, else English (positron prints two scripts)
        for (const layer of map.getStyle().layers ?? []) {
          if (layer.type !== "symbol" || !map.getLayoutProperty(layer.id, "text-field")) continue;
          if (/poi|road|highway|transport|housenumber|waterway/.test(layer.id)) {
            map.setLayoutProperty(layer.id, "visibility", "none");
            continue;
          }
          map.setLayoutProperty(layer.id, "text-field", ["coalesce", ["get", "name:mn"], ["get", "name:en"], ["get", "name"]]);
        }

        map.addSource("routes", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: pins.map((p) => ({
              type: "Feature",
              properties: { key: p.key },
              geometry: { type: "LineString", coordinates: routes[p.key] },
            })),
          },
        });
        map.addLayer({
          id: "routes-base",
          type: "line",
          source: "routes",
          layout: { "line-cap": "round" },
          // No line-dasharray: maplibre 6.16 throws in setConstantDashPositions with it
          paint: { "line-color": "#0e8f84", "line-width": 1.4, "line-opacity": 0.3 },
        });
        map.addLayer({
          id: "routes-active-glow",
          type: "line",
          source: "routes",
          filter: ["==", ["get", "key"], activeRef.current],
          layout: { "line-cap": "round" },
          paint: { "line-color": "#e8b86d", "line-width": 9, "line-opacity": 0.25, "line-blur": 4 },
        });
        map.addLayer({
          id: "routes-active",
          type: "line",
          source: "routes",
          filter: ["==", ["get", "key"], activeRef.current],
          layout: { "line-cap": "round" },
          paint: { "line-color": "#0e8f84", "line-width": 2.6 },
        });

        // Hub
        const hub = document.createElement("div");
        hub.className = "map-hub";
        hub.innerHTML = `<span class="map-hub-dot"></span><span class="map-hub-label">${HUB.name}</span>`;
        new Marker({ element: hub, anchor: "center" }).setLngLat([HUB.lng, HUB.lat]).addTo(map);

        // Photo pins
        pins.forEach((p, i) => {
          const root = document.createElement("div");
          const el = document.createElement("button");
          el.type = "button";
          el.className = "map-pin";
          el.style.setProperty("--d", `${0.6 + i * 0.12}s`);
          el.setAttribute("aria-label", p.name);
          el.innerHTML = `
            <span class="map-pin-ring"></span>
            <span class="map-pin-photo" style="background-image:url('${p.photo}')"></span>
            <span class="map-pin-label"><b>${p.name}</b><i>${p.label}</i></span>`;
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            onSelectRef.current(p.key);
          });
          root.appendChild(el);
          pinEls.current[p.key] = el;
          new Marker({ element: root, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map);
        });

        // Plane that flies the active route
        const plane = document.createElement("div");
        plane.className = "map-plane";
        plane.innerHTML = PLANE_SVG;
        planeRef.current = new Marker({ element: plane, anchor: "center", rotationAlignment: "map" })
          .setLngLat([HUB.lng, HUB.lat])
          .addTo(map);

        let t0 = performance.now();
        let lastStep = "";
        const fly = (now: number) => {
          const path = routes[activeRef.current];
          if (path && planeRef.current) {
            const t = ((now - t0) / 4200) % 1;
            const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
            const i = Math.min(path.length - 2, Math.floor(eased * (path.length - 1)));
            // Only touch the marker when it advances to the next route point (~15×/s, not 60)
            const step = `${activeRef.current}:${i}`;
            if (step === lastStep) {
              rafRef.current = requestAnimationFrame(fly);
              return;
            }
            lastStep = step;
            const a = map.project(path[i] as LngLatLike);
            const b = map.project(path[i + 1] as LngLatLike);
            const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
            planeRef.current.setLngLat(path[i] as LngLatLike).setRotation(angle);
            plane.style.opacity = String(t < 0.06 ? t / 0.06 : t > 0.94 ? (1 - t) / 0.06 : 1);
          }
          rafRef.current = requestAnimationFrame(fly);
        };
        rafRef.current = requestAnimationFrame(fly);
        map.on("click", () => (t0 = performance.now()));

        readyRef.current = true;
        highlight(activeRef.current);

        // Opening shot: from the globe down to a frame holding every route
        map.fitBounds(
          [
            [28, -12],
            [120, 50],
          ],
          { padding: { top: 90, bottom: 40 + insetRef.current, left: 40, right: 40 }, duration: 2600, essential: true },
        );
        window.setTimeout(() => focus(activeRef.current), 3000);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
      readyRef.current = false;
      pinEls.current = {};
    };
    // Built once: rebuilding the map on new pins would restart the opening flight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function highlight(key: string) {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.setFilter("routes-active", ["==", ["get", "key"], key]);
    map.setFilter("routes-active-glow", ["==", ["get", "key"], key]);
    Object.entries(pinEls.current).forEach(([k, el]) => el.classList.toggle("is-active", k === key));
  }

  function focus(key: string) {
    const map = mapRef.current;
    const path = routes[key];
    if (!map || !path) return;
    const lngs = path.map((c) => c[0]);
    const lats = path.map((c) => c[1]);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: { top: 110, bottom: 60 + insetRef.current, left: 50, right: 50 }, maxZoom: 5, duration: 1600, essential: true },
    );
  }

  useEffect(() => {
    activeRef.current = active;
    highlight(active);
    if (readyRef.current) focus(active);
  }, [active]);

  return (
    <div className={fullscreen ? "relative h-full" : "relative aspect-[16/10] overflow-hidden rounded-[1.25rem]"}>
      <div ref={containerRef} className="elite-map-canvas h-full w-full" />
    </div>
  );
}
