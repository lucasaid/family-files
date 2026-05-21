// src/Albums/index.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import AlbumList from './AlbumList';
import AlbumView from './AlbumView';

export default function AlbumsRoute() {
  const { albumName } = useParams<{ albumName?: string }>();
  return albumName ? <AlbumView /> : <AlbumList />;
}
