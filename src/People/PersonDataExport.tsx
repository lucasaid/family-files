import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { fcName } from '../utils/people';
import { formatDisplayDate } from '../utils/exiftool';
import { FamilyChartPerson, Person, Photo, FamilyDocument } from '../context/types';
import Modal from '../components/Modal';

function buildReport(
  person: Person,
  photos: Photo[],
  documents: FamilyDocument[],
  fc: FamilyChartPerson | null,
  chart: FamilyChartPerson[],
  categoryName: (id: string | null | undefined) => string,
): string {
  const lines: string[] = [];
  const line = (s = '') => lines.push(s);
  const section = (title: string) => {
    line();
    line(`${'═'.repeat(3)} ${title} ${'═'.repeat(3)}`);
    line();
  };

  line(`PERSON RECORD: ${person.name}`);
  line(`Generated: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`);

  // ── Family tree ──────────────────────────────────────────────────────────────
  if (fc) {
    const d = fc.data;
    section(`FAMILY TREE`);

    const events: [string, string | undefined, string | undefined][] = [
      ['Born',        d.birthday,         d.birthPlace],
      ['Christened',  d.christeningDate,  d.christeningPlace],
      ['Died',        d.death,            d.deathPlace],
      ['Buried',      d.burialDate,       d.burialPlace],
      ['Emigrated',   d.emigrationDate,   d.emigrationPlace],
      ['Immigrated',  d.immigrationDate,  d.immigrationPlace],
    ];
    for (const [label, date, place] of events) {
      if (date || place) line(`${label}: ${[date, place].filter(Boolean).join(' · ')}`);
    }
    if (d.deathCause) line(`Cause of death: ${d.deathCause}`);

    const attrs: [string, string | undefined][] = [
      ['Gender',      d.gender === 'M' ? 'Male' : d.gender === 'F' ? 'Female' : undefined],
      ['Occupation',  d.occupation],
      ['Nationality', d.nationality],
      ['Religion',    d.religion],
      ['Education',   d.education],
      ['Residence',   d.residence],
      ['Title',       d.title],
    ];
    for (const [label, val] of attrs) {
      if (val) line(`${label}: ${val}`);
    }

    const marriages = d.marriages ?? [];
    if (marriages.length) {
      line();
      line(`Marriages:`);
      for (const m of marriages) {
        const spouse = chart.find(p => p.id === m.spouseId);
        const parts = [spouse ? fcName(spouse) : m.spouseId];
        if (m.date) parts.push(`married ${m.date}`);
        if (m.place) parts.push(m.place);
        if (m.divorceDate) parts.push(`divorced ${m.divorceDate}`);
        line(`  ${parts.join(' · ')}`);
      }
    }

    const resolveName = (id: string) => {
      const p = chart.find(c => c.id === id);
      return p ? fcName(p) : id;
    };
    const parents   = fc.rels.parents  ?? [];
    const children  = fc.rels.children ?? [];
    const siblings  = (() => {
      const seen = new Set<string>();
      for (const pid of parents) {
        const parent = chart.find(c => c.id === pid);
        for (const cid of parent?.rels.children ?? []) {
          if (cid !== fc.id) seen.add(cid);
        }
      }
      return Array.from(seen);
    })();

    if (parents.length)  line(`\nParents:  ${parents.map(resolveName).join(', ')}`);
    if (siblings.length) line(`Siblings: ${siblings.map(resolveName).join(', ')}`);
    if (children.length) line(`Children: ${children.map(resolveName).join(', ')}`);
  } else {
    section('FAMILY TREE');
    line('Not linked to a family tree record.');
  }

  // ── Photos ───────────────────────────────────────────────────────────────────
  section(`PHOTOS (${photos.length})`);
  if (photos.length === 0) {
    line('No photos.');
  } else {
    for (const photo of photos) {
      line(`File: ${photo.file}`);
      if (photo.date) line(`Date: ${formatDisplayDate(photo.date)}`);
      const locParts = [photo.city, photo.state, photo.country].filter(Boolean);
      if (locParts.length) line(`Location: ${locParts.join(', ')}`);
      if (photo.location) line(`GPS: ${photo.location.lat}, ${photo.location.lng}`);
      if (photo.album) line(`Album: ${photo.album}`);
      if (photo.caption) line(`Caption: ${photo.caption}`);
      if (photo.keywords.length) line(`Keywords: ${photo.keywords.join(', ')}`);
      if (photo.camera) line(`Camera: ${photo.camera}`);
      if (photo.rating) line(`Rating: ${'★'.repeat(photo.rating)}`);
      line('---');
    }
  }

  // ── Documents ────────────────────────────────────────────────────────────────
  section(`DOCUMENTS (${documents.length})`);
  if (documents.length === 0) {
    line('No documents.');
  } else {
    for (const doc of documents) {
      line(`Title: ${doc.title}`);
      if (doc.date) line(`Date: ${doc.date}`);
      const cat = categoryName(doc.categoryId);
      if (cat) line(`Category: ${cat}`);
      if (doc.description) line(`Description: ${doc.description}`);
      if (doc.type === 'note' && doc.content) {
        line('Content:');
        for (const l of doc.content.split('\n')) line(`  ${l}`);
      }
      if (doc.type === 'file' && doc.filePath) line(`File: ${doc.filePath}`);
      line('---');
    }
  }

  return lines.join('\n');
}

interface Props {
  person: Person;
  onClose: () => void;
}

export default function PersonDataExport({ person, onClose }: Props) {
  const { state } = useAppContext();
  const [copied, setCopied] = useState(false);

  const photos = useMemo(
    () => state.photos.filter(p => p.faces.some(f => f.personId === person.id)),
    [state.photos, person.id]
  );

  const documents = useMemo(
    () => state.documents.filter(d => d.personIds.includes(person.id)),
    [state.documents, person.id]
  );

  const fc = person.familyTreeId
    ? (state.familyChart?.find(f => f.id === person.familyTreeId) ?? null)
    : null;

  const categoryName = (id: string | null | undefined) => {
    if (!id) return '';
    return state.categories.find(c => c.id === id)?.name ?? '';
  };

  const report = useMemo(
    () => buildReport(person, photos, documents, fc, state.familyChart ?? [], categoryName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [person, photos, documents, fc, state.familyChart, state.categories]
  );

  const copy = () => {
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal title={`${person.name} — Full Record`} onClose={onClose} width={680} maxHeight="82vh">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: '1px solid var(--border-muted)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)' }}>
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'} · {documents.length} {documents.length === 1 ? 'document' : 'documents'}
            {fc ? ' · family tree linked' : ''}
          </span>
          <button
            onClick={copy}
            style={{
              background: copied ? 'var(--accent)' : 'var(--btn-cancel-bg)',
              border: `1px solid ${copied ? 'var(--accent)' : 'var(--btn-cancel-border)'}`,
              borderRadius: 4, padding: '4px 12px',
              fontSize: 'var(--font-size-label)', cursor: 'pointer',
              color: copied ? 'var(--text-on-accent)' : 'var(--btn-cancel-text)',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {copied ? 'Copied' : 'Copy to clipboard'}
          </button>
        </div>

        {/* Report text */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          <pre style={{
            margin: 0,
            fontSize: 'var(--font-size-label)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-2)',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {report}
          </pre>
        </div>
      </div>
    </Modal>
  );
}
