import { appReducer, initialState } from './AppContext';
import { Photo, Person, FamilyDocument, FaceRegion } from './types';

const photo: Photo = {
  file: 'IMG_001.jpg', path: '/images/IMG_001.jpg', fsPath: '/data/images/IMG_001.jpg',
  album: null, date: '2020:01:01', location: null, city: null, state: null, country: null,
  camera: 'iPhone', caption: null, rating: null, keywords: [], faces: [],
};
const person: Person = { id: 'p1', name: 'Alice' };
const doc: FamilyDocument = {
  id: 'd1', title: 'Birth cert', date: '1990:01:01',
  description: '', personIds: [], type: 'file', filePath: 'cert.pdf',
};

test('SET_PHOTOS sets photos and activePhoto to first', () => {
  const s = appReducer(initialState, { type: 'SET_PHOTOS', photos: [photo] });
  expect(s.photos).toEqual([photo]);
  expect(s.activePhoto).toEqual(photo);
});

test('SET_ACTIVE_PHOTO updates activePhoto', () => {
  const s0 = appReducer(initialState, { type: 'SET_PHOTOS', photos: [photo] });
  const photo2 = { ...photo, file: 'IMG_002.jpg' };
  const s1 = appReducer(s0, { type: 'SET_ACTIVE_PHOTO', photo: photo2 });
  expect(s1.activePhoto?.file).toBe('IMG_002.jpg');
});

test('UPDATE_PHOTO_META updates matching photo and activePhoto', () => {
  const s0 = appReducer(initialState, { type: 'SET_PHOTOS', photos: [photo] });
  const s1 = appReducer(s0, { type: 'UPDATE_PHOTO_META', file: 'IMG_001.jpg', meta: { caption: 'Hello' } });
  expect(s1.activePhoto?.caption).toBe('Hello');
  expect(s1.photos[0].caption).toBe('Hello');
});

test('ADD_FACE_REGION appends region to matching photo', () => {
  const s0 = appReducer(initialState, { type: 'SET_PHOTOS', photos: [photo] });
  const region: FaceRegion = { personId: 'p1', name: 'Alice', x: 0.1, y: 0.1, w: 0.2, h: 0.3 };
  const s1 = appReducer(s0, { type: 'ADD_FACE_REGION', file: 'IMG_001.jpg', region });
  expect(s1.activePhoto?.faces).toHaveLength(1);
  expect(s1.activePhoto?.faces[0].name).toBe('Alice');
});

test('REMOVE_FACE_REGION removes region by name', () => {
  const region: FaceRegion = { personId: 'p1', name: 'Alice', x: 0.1, y: 0.1, w: 0.2, h: 0.3 };
  const photoWithFace = { ...photo, faces: [region] };
  const s0 = appReducer(initialState, { type: 'SET_PHOTOS', photos: [photoWithFace] });
  const s1 = appReducer(s0, { type: 'REMOVE_FACE_REGION', file: 'IMG_001.jpg', regionName: 'Alice' });
  expect(s1.activePhoto?.faces).toHaveLength(0);
});

test('SET_TAGGING_MODE toggles isTaggingMode', () => {
  const s = appReducer(initialState, { type: 'SET_TAGGING_MODE', enabled: true });
  expect(s.isTaggingMode).toBe(true);
});

test('ADD_PERSON appends to people', () => {
  const s = appReducer(initialState, { type: 'ADD_PERSON', person });
  expect(s.people).toHaveLength(1);
  expect(s.people[0].name).toBe('Alice');
});

test('UPDATE_PERSON renames in-place', () => {
  const s0 = appReducer(initialState, { type: 'ADD_PERSON', person });
  const s1 = appReducer(s0, { type: 'UPDATE_PERSON', person: { ...person, name: 'Alicia' } });
  expect(s1.people[0].name).toBe('Alicia');
});

test('REMOVE_PERSON removes from people', () => {
  const s0 = appReducer(initialState, { type: 'ADD_PERSON', person });
  const s1 = appReducer(s0, { type: 'REMOVE_PERSON', id: 'p1' });
  expect(s1.people).toHaveLength(0);
});

test('ADD_DOCUMENT appends to documents', () => {
  const s = appReducer(initialState, { type: 'ADD_DOCUMENT', document: doc });
  expect(s.documents).toHaveLength(1);
});

test('UPDATE_DOCUMENT updates matching document', () => {
  const s0 = appReducer(initialState, { type: 'ADD_DOCUMENT', document: doc });
  const s1 = appReducer(s0, { type: 'UPDATE_DOCUMENT', document: { ...doc, title: 'Updated' } });
  expect(s1.documents[0].title).toBe('Updated');
});

test('REMOVE_DOCUMENT removes from documents', () => {
  const s0 = appReducer(initialState, { type: 'ADD_DOCUMENT', document: doc });
  const s1 = appReducer(s0, { type: 'REMOVE_DOCUMENT', id: 'd1' });
  expect(s1.documents).toHaveLength(0);
});
