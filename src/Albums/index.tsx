import React from 'react';
import { useParams } from 'react-router-dom';
import AlbumList from './AlbumList';
import AlbumView from './AlbumView';

export default function AlbumsRoute() {
  const params = useParams<{ '*': string }>();
  const albumPath = params['*'] || '';
  return albumPath ? <AlbumView albumPath={albumPath} /> : <AlbumList />;
}
