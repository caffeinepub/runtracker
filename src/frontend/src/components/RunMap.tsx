import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [51.505, -0.09];

interface RunMapProps {
  routePoints: [number, number][];
  currentPosition: [number, number] | null;
  defaultCenter?: [number, number];
}

export function RunMap({
  routePoints,
  currentPosition,
  defaultCenter,
}: RunMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const initializedRef = useRef(false);

  // Initialize map once — intentionally omit currentPosition/defaultCenter from deps
  // biome-ignore lint/correctness/useExhaustiveDependencies: map initializes once only
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const center: [number, number] =
      currentPosition ?? defaultCenter ?? DEFAULT_CENTER;
    const map = L.map(containerRef.current, {
      center,
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      },
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  // Update route polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (routePoints.length > 1) {
      polylineRef.current = L.polyline(routePoints, {
        color: "#2ED3C6",
        weight: 4,
        opacity: 0.9,
      }).addTo(map);
    }
  }, [routePoints]);

  // Update current position marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentPosition) return;

    if (markerRef.current) {
      markerRef.current.setLatLng(currentPosition);
    } else {
      const pulseIcon = L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#F36D21;border:3px solid #fff;box-shadow:0 0 10px rgba(243,109,33,0.8)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      markerRef.current = L.marker(currentPosition, { icon: pulseIcon }).addTo(
        map,
      );
    }
    map.panTo(currentPosition);
  }, [currentPosition]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] rounded-lg"
      data-ocid="map.canvas_target"
    />
  );
}
