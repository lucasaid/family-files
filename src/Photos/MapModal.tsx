import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Modal from '../components/Modal';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  points: { lat: number; lng: number }[];
  onClose: () => void;
}

export default function MapModal({ points, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const isOnline = navigator.onLine;

  useEffect(() => {
    if (!isOnline || !containerRef.current || points.length === 0) return;

    const map = L.map(containerRef.current);
    mapRef.current = map;

    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    });

    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a> — Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
      }
    );

    street.addTo(map);
    L.control.layers({ 'Map': street, 'Satellite': satellite }, {}, { position: 'topright' }).addTo(map);

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      L.marker([points[0].lat, points[0].lng]).addTo(map);
    } else {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng] as L.LatLngTuple));
      map.fitBounds(bounds, { padding: [40, 40] });
      points.forEach(p => L.marker([p.lat, p.lng]).addTo(map));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [points, isOnline]);

  return (
    <Modal title="Location" onClose={onClose} width="85vw" height="80vh">
      {isOnline ? (
        <div ref={containerRef} style={{ flex: 1, width: '100%' }} />
      ) : (
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, padding: 32, textAlign: 'center',
        }}>
          <div style={{ fontSize: 'var(--font-size-title)', fontWeight: 600, color: 'var(--text-1)' }}>
            You're offline
          </div>
          <div style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-4)', maxWidth: 320, lineHeight: 1.6 }}>
            An internet connection is required to view the interactive map. Connect and try again.
          </div>
          <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-3)', marginTop: 4, fontFamily: 'var(--font-mono)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {points.map((p, i) => (
              <span key={i}>{p.lat.toFixed(6)}, {p.lng.toFixed(6)}</span>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
