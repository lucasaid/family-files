import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Photo, FaceRegion } from '../context/types';

interface Props {
  personId: string;
  size?: number;
}

function AvatarImage({ photo, face, size }: { photo: Photo; face: FaceRegion; size: number }) {
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);

  const PAD = 1.4;
  const cx = face.x + face.w / 2;
  const cy = face.y + face.h / 2;

  let imgStyle: React.CSSProperties = { position: 'absolute', opacity: 0 };

  if (natW > 0 && natH > 0) {
    const scale = Math.min(
      size / (face.w * PAD * natW),
      size / (face.h * PAD * natH),
    );
    const scaledW = natW * scale;
    const scaledH = natH * scale;
    imgStyle = {
      position: 'absolute',
      width: scaledW,
      height: scaledH,
      left: size / 2 - cx * scaledW,
      top: size / 2 - cy * scaledH,
      objectFit: 'fill',
    };
  }

  return (
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
  );
}

export default function PersonAvatar({ personId, size = 200 }: Props) {
  const { state } = useAppContext();
  const person = state.people.find(p => p.id === personId);

  // Prefer the pinned primary photo; fall back to first tagged photo
  const allTagged = state.photos.filter(p => p.faces.some(f => f.personId === personId));
  const photo = (person?.primaryPhotoFile
    ? allTagged.find(p => p.file === person.primaryPhotoFile)
    : undefined) ?? allTagged[0];

  const face = photo?.faces.find(f => f.personId === personId);

  if (!photo || !face) {
    const fc = person?.familyTreeId
      ? state.familyChart?.find(f => f.id === person.familyTreeId)
      : undefined;
    const gender = fc?.data.gender;
    const emoji = gender === 'M' ? '👨' : gender === 'F' ? '👩' : '👤';
    return (
      <div style={{
        width: size, height: size, borderRadius: 4,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.42, userSelect: 'none',
        flexShrink: 0,
      }}>
        {emoji}
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: 4,
      overflow: 'hidden', position: 'relative',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <AvatarImage photo={photo} face={face} size={size} />
    </div>
  );
}
