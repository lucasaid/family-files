import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { fcName, writePeopleJson } from '../utils/people';
import { dataPath } from '../utils/paths';
import { FamilyChartPerson, Person } from '../context/types';
import PersonPhotoGrid from './PersonPhotoGrid';
import PersonDocList from './PersonDocList';
import PersonAvatar from './PersonAvatar';
import PersonDataExport from './PersonDataExport';

// Chip for a single relative — links to their person page if they're linked in app
function RelativeChip({ fc, linkedPerson }: { fc: FamilyChartPerson; linkedPerson: Person | null }) {
  const navigate = useNavigate();
  const name = fcName(fc);
  const birth = fc.data.birthday;

  if (linkedPerson) {
    return (
      <button
        onClick={() => navigate(`/people/${linkedPerson.id}`)}
        className="btn-ghost-hover"
        style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
          borderRadius: 5, padding: '6px 12px', cursor: 'pointer',
          textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 1,
        }}
      >
        <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--accent)', fontWeight: 500 }}>{name}</span>
        {birth && <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-3)' }}>b. {birth}</span>}
      </button>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)',
      borderRadius: 5, padding: '6px 12px',
      display: 'flex', flexDirection: 'column', gap: 1,
    }}>
      <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-2)' }}>{name}</span>
      {birth && <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-3)' }}>b. {birth}</span>}
    </div>
  );
}

function siblingIds(fc: FamilyChartPerson, chart: FamilyChartPerson[]): string[] {
  const seen = new Set<string>();
  for (const parentId of fc.rels.parents ?? []) {
    const parent = chart.find(p => p.id === parentId);
    for (const childId of parent?.rels.children ?? []) {
      if (childId !== fc.id) seen.add(childId);
    }
  }
  return Array.from(seen);
}

function RelGroup({ label, ids, chart, people }: {
  label: string;
  ids: string[];
  chart: FamilyChartPerson[];
  people: Person[];
}) {
  const members = ids
    .map(id => chart.find(fc => fc.id === id))
    .filter((fc): fc is FamilyChartPerson => fc !== undefined);

  if (members.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {members.map(fc => {
          const linked = people.find(p => p.familyTreeId === fc.id) ?? null;
          return <RelativeChip key={fc.id} fc={fc} linkedPerson={linked} />;
        })}
      </div>
    </div>
  );
}

// ─── Family tree data display ────────────────────────────────────────────────

function DataField({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 'var(--font-size-title)', color: 'var(--text-1)' }}>{value}</div>
      {sub && <div style={{ fontSize: 'var(--font-size-ui)', color: 'var(--text-4)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-section)', textTransform: 'uppercase', color: 'var(--text-3)', margin: '0 0 12px', paddingBottom: 6, borderBottom: '1px solid var(--border-muted)' }}>
      {children}
    </h2>
  );
}

function FamilyTreeDetails({ fc }: { fc: FamilyChartPerson }) {
  const { state } = useAppContext();
  const chart = state.familyChart ?? [];
  const people = state.people;
  const d = fc.data;

  const genderLabel = d.gender === 'M' ? 'Male' : d.gender === 'F' ? 'Female' : null;

  // Build event rows: [label, date, place?, sub?]
  type EventRow = { label: string; date?: string; place?: string; sub?: string };
  const events: EventRow[] = [
    (d.birthday || d.birthPlace)    && { label: 'Born',        date: d.birthday,       place: d.birthPlace },
    (d.christeningDate || d.christeningPlace) && { label: 'Christened', date: d.christeningDate, place: d.christeningPlace },
    (d.death || d.deathPlace)       && { label: 'Died',        date: d.death,          place: d.deathPlace,  sub: d.deathCause },
    (d.burialDate || d.burialPlace) && { label: 'Buried',      date: d.burialDate,     place: d.burialPlace },
    (d.emigrationDate || d.emigrationPlace) && { label: 'Emigrated',  date: d.emigrationDate,  place: d.emigrationPlace },
    (d.immigrationDate || d.immigrationPlace) && { label: 'Immigrated', date: d.immigrationDate, place: d.immigrationPlace },
  ].filter(Boolean) as EventRow[];

  const attrs: { label: string; value: string }[] = [
    genderLabel                && { label: 'Gender',      value: genderLabel },
    d.title                    && { label: 'Title',        value: d.title },
    d.occupation               && { label: 'Occupation',   value: d.occupation },
    d.nationality              && { label: 'Nationality',  value: d.nationality },
    d.religion                 && { label: 'Religion',     value: d.religion },
    d.education                && { label: 'Education',    value: d.education },
    d.residence                && { label: 'Residence',    value: d.residence },
    (d.nickname || d.suffix || d.prefix) && {
      label: 'Also known as',
      value: [d.prefix, d.nickname, d.suffix].filter(Boolean).join(' · '),
    },
  ].filter(Boolean) as { label: string; value: string }[];

  const marriages = d.marriages ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Life events */}
      {events.length > 0 && (
        <div>
          <SectionLabel>Life Events</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 40px' }}>
            {events.map(({ label, date, place, sub }) => (
              <DataField
                key={label}
                label={label}
                value={[date, place].filter(Boolean).join(' · ')}
                sub={sub}
              />
            ))}
          </div>
        </div>
      )}

      {/* Personal attributes */}
      {attrs.length > 0 && (
        <div>
          <SectionLabel>Details</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 40px' }}>
            {attrs.map(({ label, value }) => (
              <DataField key={label} label={label} value={value} />
            ))}
          </div>
        </div>
      )}

      {/* Marriages */}
      {marriages.length > 0 && (
        <div>
          <SectionLabel>{marriages.length === 1 ? 'Marriage' : 'Marriages'}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {marriages.map((m, i) => {
              const spouse = chart.find(p => p.id === m.spouseId);
              const linkedPerson = people.find(p => p.familyTreeId === m.spouseId) ?? null;
              return (
                <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 32px', alignItems: 'flex-start' }}>
                  {spouse && (
                    <div>
                      <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 }}>
                        {m.divorceDate ? 'Former Spouse' : 'Spouse'}
                      </div>
                      <RelativeChip fc={spouse} linkedPerson={linkedPerson} />
                    </div>
                  )}
                  {m.date && <DataField label="Married" value={m.date} sub={m.place} />}
                  {m.divorceDate && <DataField label="Divorced" value={m.divorceDate} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Family relationships */}
      <div>
        <SectionLabel>Family</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RelGroup label="Parents"  ids={fc.rels.parents  ?? []} chart={chart} people={people} />
          <RelGroup label={fc.rels.spouses && fc.rels.spouses.length > 1 ? 'Spouses' : 'Spouse'} ids={fc.rels.spouses ?? []} chart={chart} people={people} />
          <RelGroup label="Siblings" ids={siblingIds(fc, chart)} chart={chart} people={people} />
          <RelGroup label="Children" ids={fc.rels.children ?? []} chart={chart} people={people} />
        </div>
      </div>
    </div>
  );
}

// ─── Link control ────────────────────────────────────────────────────────────

type LinkMode = 'idle' | 'confirm' | 'search';

function matchScore(fc: FamilyChartPerson, q: string): number {
  const first = fc.data['first name'].toLowerCase();
  const last = fc.data['last name'].toLowerCase();
  const full = `${first} ${last}`.trim();
  if (full === q) return 3;
  if (first === q) return 2;
  if (full.includes(q) || q.split(' ').every(w => full.includes(w))) return 1;
  return 0;
}

function FamilyTreeLink({ personId }: { personId: string }) {
  const { state, dispatch } = useAppContext();
  const [mode, setMode] = useState<LinkMode>('idle');
  const [autoMatch, setAutoMatch] = useState<FamilyChartPerson | null>(null);
  const [query, setQuery] = useState('');

  const person = state.people.find(p => p.id === personId)!;
  const linked = person.familyTreeId
    ? state.familyChart?.find(fc => fc.id === person.familyTreeId) ?? null
    : null;

  const candidates = useMemo<FamilyChartPerson[]>(() => {
    if (!state.familyChart) return [];
    const q = query.toLowerCase();
    return state.familyChart
      .filter(fc => matchScore(fc, q) > 0)
      .sort((a, b) => {
        const scoreDiff = matchScore(b, q) - matchScore(a, q);
        if (scoreDiff !== 0) return scoreDiff;
        return a.data['first name'].localeCompare(b.data['first name']);
      });
  }, [state.familyChart, query]);

  function openLinking() {
    if (!state.familyChart) return;
    const q = person.name.toLowerCase();
    const matches = state.familyChart.filter(fc => matchScore(fc, q) > 0);
    if (matches.length === 1) {
      setAutoMatch(matches[0]);
      setMode('confirm');
    } else {
      setAutoMatch(null);
      setQuery(person.name);
      setMode('search');
    }
  }

  function cancel() {
    setMode('idle');
    setAutoMatch(null);
    setQuery('');
  }

  async function save(updated: typeof person) {
    const updatedPeople = state.people.map(p => p.id === personId ? updated : p);
    dispatch({ type: 'UPDATE_PERSON', person: updated });
    await writePeopleJson(updatedPeople);
  }

  async function handleLink(fc: FamilyChartPerson) {
    await save({ ...person, familyTreeId: fc.id });
    cancel();
  }

  async function handleUnlink() {
    const { familyTreeId: _, ...rest } = person;
    await save(rest as typeof person);
  }

  if (!state.familyChart) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-section)', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          Family Tree
        </div>
        {linked && mode === 'idle' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={openLinking} className="btn-ghost-hover" style={{ background: 'none', border: '1px solid var(--border-muted)', borderRadius: 4, padding: '3px 9px', fontSize: 'var(--font-size-label)', cursor: 'pointer', color: 'var(--text-4)' }}>
              Change
            </button>
            <button onClick={handleUnlink} className="btn-ghost-hover" style={{ background: 'none', border: '1px solid var(--border-muted)', borderRadius: 4, padding: '3px 9px', fontSize: 'var(--font-size-label)', cursor: 'pointer', color: 'var(--text-4)' }}>
              Unlink
            </button>
          </div>
        )}
      </div>

      {mode === 'idle' && linked && <FamilyTreeDetails fc={linked} />}

      {mode === 'idle' && !linked && (
        <button
          onClick={openLinking}
          className="btn-ghost-hover"
          style={{ background: 'none', border: '1px dashed var(--border-muted)', borderRadius: 6, padding: '10px 16px', fontSize: 'var(--font-size-ui)', cursor: 'pointer', color: 'var(--text-4)', width: '100%', textAlign: 'left' }}
        >
          + Link to family tree record
        </button>
      )}

      {mode === 'confirm' && autoMatch && (
        <div style={{ border: '1px solid var(--border-muted)', borderRadius: 6, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-2)', marginBottom: 4 }}>
              Is this the right record?
            </div>
            <div style={{ fontSize: 'var(--font-size-wordmark)', fontWeight: 500, color: 'var(--text-1)' }}>
              {fcName(autoMatch)}
            </div>
            {autoMatch.data.birthday && (
              <div style={{ fontSize: 'var(--font-size-ui)', color: 'var(--text-4)', marginTop: 2 }}>b. {autoMatch.data.birthday}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => handleLink(autoMatch)}
              style={{ background: 'var(--accent)', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 'var(--font-size-ui)', cursor: 'pointer', color: 'var(--text-on-accent)', fontWeight: 500 }}
            >
              Yes, link
            </button>
            <button
              onClick={() => { setAutoMatch(null); setQuery(person.name); setMode('search'); }}
              className="btn-ghost-hover"
              style={{ background: 'none', border: '1px solid var(--border-muted)', borderRadius: 4, padding: '6px 12px', fontSize: 'var(--font-size-ui)', cursor: 'pointer', color: 'var(--text-4)' }}
            >
              Search
            </button>
            <button
              onClick={cancel}
              className="btn-ghost-hover"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {mode === 'search' && (
        <div style={{ border: '1px solid var(--border-muted)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              autoFocus
              type="text"
              placeholder="Search by name…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ flex: 1, background: 'none', border: 'none', fontSize: 'var(--font-size-body)', color: 'var(--text-1)' }}
            />
            <button onClick={cancel} className="btn-ghost-hover" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>
              ×
            </button>
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {candidates.length === 0 ? (
              <div style={{ padding: '12px 16px', fontSize: 'var(--font-size-body)', color: 'var(--text-4)' }}>No matches</div>
            ) : (
              candidates.map(fc => (
                <button
                  key={fc.id}
                  onClick={() => handleLink(fc)}
                  className="btn-ghost-hover"
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--border-muted)', padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-1)' }}>{fcName(fc)}</span>
                  {fc.data.birthday && <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)' }}>b. {fc.data.birthday}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PersonDetail() {
  const { id } = useParams<{ id?: string }>();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  const [hasResearchProfile, setHasResearchProfile] = useState(false);
  const [showExport, setShowExport] = useState(false);
  useEffect(() => {
    if (!id) return;
    try {
      const fs   = (window as any).require('fs')   as typeof import('fs');
      const path = (window as any).require('path') as typeof import('path');
      setHasResearchProfile(fs.existsSync(path.join(dataPath, 'research', `${id}.json`)));
    } catch { setHasResearchProfile(false); }
  }, [id]);

  if (!id) return <div style={{ padding: 24, color: 'var(--text-3)' }}>Invalid URL.</div>;
  const person = state.people.find(p => p.id === id);
  if (!person) return <div style={{ padding: 24, color: 'var(--text-3)' }}>Person not found.</div>;

  const photoCount = state.photos.filter(p => p.faces.some(f => f.personId === id)).length;
  const docCount = state.documents.filter(d => d.personIds.includes(id)).length;

  return (
    <div style={{ padding: '32px 36px', maxWidth: 800, fontFamily: 'var(--font-sans)', color: 'var(--text-1)' }}>
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/people')}
        className="btn-ghost-hover"
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 'var(--font-size-label)', fontWeight: 500, letterSpacing: 'var(--tracking-wider)',
          textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 9 }}>←</span> People
      </button>

      {/* Name + meta header */}
      <div style={{ marginBottom: 36, paddingBottom: 24, borderBottom: '1px solid var(--border)', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <PersonAvatar personId={person.id} size={200} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 'var(--font-size-display)', color: 'var(--text-heading)', margin: '0 0 8px', letterSpacing: 'var(--tracking-tight)' }}>
            {person.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-3)', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase' }}>
              {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
            </span>
            <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--border-muted)' }}>·</span>
            <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-3)', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase' }}>
              {docCount} {docCount === 1 ? 'document' : 'documents'}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {person.familyTreeId && (
              <button
                onClick={() => navigate(`/tree?focus=${encodeURIComponent(person.familyTreeId!)}`)}
                className="btn-ghost-hover"
                style={{
                  background: 'none', border: '1px solid var(--border-muted)', borderRadius: 5,
                  padding: '6px 12px', cursor: 'pointer',
                  fontSize: 'var(--font-size-ui)', color: 'var(--text-3)', letterSpacing: 'var(--tracking-wordmark)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 10 }}>🌳</span> Show in family tree
              </button>
            )}
            {hasResearchProfile && (
              <button
                onClick={() => navigate(`/profile/${id}`)}
                className="btn-ghost-hover"
                style={{
                  background: 'none', border: '1px solid var(--border-muted)', borderRadius: 5,
                  padding: '6px 12px', cursor: 'pointer',
                  fontSize: 'var(--font-size-ui)', color: 'var(--text-3)', letterSpacing: 'var(--tracking-wordmark)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 10 }}>📋</span> Research profile
              </button>
            )}
            <button
              onClick={() => setShowExport(true)}
              className="btn-ghost-hover"
              style={{
                background: 'none', border: '1px solid var(--border-muted)', borderRadius: 5,
                padding: '6px 12px', cursor: 'pointer',
                fontSize: 'var(--font-size-ui)', color: 'var(--text-3)', letterSpacing: 'var(--tracking-wordmark)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              Export record
            </button>
          </div>
        </div>
      </div>

      {/* Family Tree section */}
      {state.familyChart && (
        <div style={{ marginBottom: 36, paddingBottom: 36, borderBottom: '1px solid var(--border)' }}>
          <FamilyTreeLink personId={id} />
        </div>
      )}

      {/* Photos section */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-section)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>
          Photos
        </div>
        <PersonPhotoGrid
          personId={person.id}
          primaryPhotoFile={person.primaryPhotoFile}
          onSetPrimary={async file => {
            const updated = { ...person, primaryPhotoFile: file };
            dispatch({ type: 'UPDATE_PERSON', person: updated });
            await writePeopleJson(state.people.map(p => p.id === id ? updated : p));
          }}
        />
      </div>

      {/* Documents section */}
      <div>
        <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-section)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>
          Documents
        </div>
        <PersonDocList personId={person.id} />
      </div>

      {showExport && (
        <PersonDataExport person={person} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
