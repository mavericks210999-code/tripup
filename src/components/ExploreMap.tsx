'use client';

import { useEffect, useRef } from 'react';

interface MapPin {
  name: string;
  lat: number;
  lng: number;
  photoId: string;
}

interface ExploreMapProps {
  pins: MapPin[];
  onPinClick: (name: string) => void;
}

export default function ExploreMap({ pins, onPinClick }: ExploreMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamically import leaflet (no SSR)
    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // Fix default marker icons in webpack/Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        center: [20, 10],
        zoom: 2,
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      const customIcon = (name: string) => L.divIcon({
        className: '',
        html: `<div style="
          background:#607BFF;
          color:white;
          font-size:11px;
          font-weight:700;
          font-family:Inter,sans-serif;
          padding:5px 10px;
          border-radius:20px;
          white-space:nowrap;
          box-shadow:0 2px 8px rgba(96,123,255,0.4);
          cursor:pointer;
          border:2px solid white;
        ">${name.split(',')[0]}</div>`,
        iconAnchor: [40, 14],
      });

      pins.forEach((pin) => {
        const marker = L.marker([pin.lat, pin.lng], { icon: customIcon(pin.name) }).addTo(map);
        marker.on('click', () => onPinClick(pin.name));
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div ref={mapRef} className="w-full h-full rounded-2xl" />
    </>
  );
}
