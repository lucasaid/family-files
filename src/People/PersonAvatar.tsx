// src/People/PersonAvatar.tsx
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

interface Props {
  personId: string;
  size?: number;
}

export default function PersonAvatar({ personId, size = 200 }: Props) {
  const { state } = useAppContext();
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);

  const photo = state.photos.find(p => p.faces.some(f => f.personId === personId));
  const face = photo?.faces.find(f => f.personId === personId);

  if (!photo || !face) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 4,
        background: '#111', border: '1px solid #1e1e2e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#333', fontSize: size * 0.32, userSelect: 'none',
        flexShrink: 0,
      }}>
        ◻
      </div>
    );
  }

  const PAD = 2.0;
  const cx = face.x + face.w / 2;
  const cy = face.y + face.h / 2;

  let imgStyle: React.CSSProperties = { position: 'absolute', opacity: 0 };

  if (natW > 0 && natH > 0) {
    // Scale so the padded face region fills the container
    const scale = Math.min(
      size / (face.w * PAD * natW),
      size / (face.h * PAD * natH),
    );
    const scaledW = natW * scale;
    const scaledH = natH * scale;
    const left = size / 2 - cx * scaledW;
    const top = size / 2 - cy * scaledH;

    imgStyle = {
      position: 'absolute',
      width: scaledW,
      height: scaledH,
      left,
      top,
      objectFit: 'fill',
    };
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: 4,
      overflow: 'hidden', position: 'relative',
      background: '#111', border: '1px solid #1e1e2e',
      flexShrink: 0,
    }}>
      <img
        src={photo.path}
        alt=""
        onLoad={e => {
          const img = e.currentTarget;
          setNatW(img.naturalWidth);
          setNatH(img.naturalHeight);
        }}
        style={imgStyle}
      />
    </div>
  );
}
