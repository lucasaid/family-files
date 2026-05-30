import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Modal from '../components/Modal';

// Leaflet's default icon URLs break in bundled apps — point them at the CDN copy.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  lat: number;
  lng: number;
  onClose: () => void;
}

export default function MapModal({ lat, lng, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const isOnline = navigator.onLine;

  useEffect(() => {
    if (!isOnline || !containerRef.current) return;

    const map = L.map(containerRef.current).setView([lat, lng], 13);
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

    L.marker([lat, lng]).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, isOnline]);

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
          <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </div>
        </div>
      )}
    </Modal>
  );
}
