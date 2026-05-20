// src/Photos/FaceOverlay.tsx
import React from 'react';
import { FaceRegion } from '../context/types';

interface Props {
  faces: FaceRegion[];
  dimmed: boolean; // true when tagging mode active
}

export default function FaceOverlay({ faces, dimmed }: Props) {
  return (
    <>
      {faces.map((face, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${face.x * 100}%`,
            top: `${face.y * 100}%`,
            width: `${face.w * 100}%`,
            height: `${face.h * 100}%`,
            border: '2px solid #f0b060',
            borderRadius: 2,
            opacity: dimmed ? 0.5 : 1,
            pointerEvents: 'none',
          }}
        >
          <span style={{
            position: 'absolute', bottom: '100%', left: 0,
            background: '#f0b060', color: '#000',
            fontSize: 10, fontWeight: 'bold', padding: '1px 4px',
            borderRadius: '2px 2px 0 0', whiteSpace: 'nowrap',
          }}>
            {face.name}
          </span>
        </div>
      ))}
    </>
  );
}
