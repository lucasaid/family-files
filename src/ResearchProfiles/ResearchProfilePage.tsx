import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataPath } from '../utils/paths';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfilePersonal {
  fullName: string;
  alsoKnownAs: string;
  born: string;
  birthplace: string;
  died: string;
  deathPlace: string;
  age: string;
  occupation: string;
  religion: string;
  residence: string;
  buried: string;
  probate: string;
  causeOfDeath: string;
  lastIllness: string;
}

interface ProfileParent {
  name: string;
  occupation?: string;
  note: string;
}

interface ProfileImmigration {
  departure: string;
  ship: string;
  hamburgEntry: string;
  voyage: string;
  arrival: string;
  sydneyEntry: string;
  yearsInVictoria: string;
}

interface TimelineEvent {
  year: string;
  key: boolean;
  event: string;
  detail: string;
}

interface Child {
  name: string;
  born: number | null;
  died: number | null;
  age: number | null;
}

interface Source {
  icon: string;
  title: string;
  sub: string;
}

interface PotentialFinding {
  badge: string;
  badgeColor: string;
  badgeBg: string;
  sources: string;
  text: string;
  note: string;
}

interface ResearchGap {
  priority: 'high' | 'medium';
  num: number;
  title: string;
  detail: string;
}

interface CrossReference {
  relationship: string;
  name: string;
  personId: string;
  keyFacts: string;
}

interface ProfileData {
  personal: ProfilePersonal;
  parents: {
    father: ProfileParent;
    mother: ProfileParent;
    note: string;
  };
  immigration?: ProfileImmigration;
  timeline: TimelineEvent[];
  children: Child[];
  sources: Source[];
  discrepancies: { field: string; detail: string }[];
  potential: PotentialFinding[];
  gaps: ResearchGap[];
  // Optional enrichment fields
  tags?: string[];
  stats?: { label: string; value: string; sub: string }[];
  marriage?: { label: string; value: string }[];
  crossReferences?: CrossReference[];
}

// ─── Colours ─────────────────────────────────────────────────────────────────

const AMBER = { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
const CORAL = { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
const GRAY  = { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };

// ─── Helper components ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', margin: 0 }}>
          {title}
        </h2>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
      </div>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 1rem' }}>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
      <span style={{ color: '#6b7280', minWidth: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#111827', lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}

function GapItem({ gap, color }: { gap: ResearchGap; color: typeof CORAL }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `3px solid ${color.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', gap: 12 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: color.text, flexShrink: 0, minWidth: 24 }}>{gap.num}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{gap.title}</div>
        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{gap.detail}</div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResearchProfilePage() {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!personId) return;
    try {
      const fs   = (window as any).require('fs')   as typeof import('fs');
      const path = (window as any).require('path') as typeof import('path');
      const filePath = path.join(dataPath, 'research', `${personId}.json`);
      const raw = fs.readFileSync(filePath, 'utf-8');
      setData(JSON.parse(raw));
    } catch (e) {
      setError(String(e));
    }
  }, [personId]);

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: 'system-ui, sans-serif', color: '#6b7280' }}>
        <div style={{ marginBottom: 16 }}>Could not load research profile.</div>
        <code style={{ fontSize: 12 }}>{error}</code>
      </div>
    );
  }

  if (!data) {
    return <div style={{ padding: 40, fontFamily: 'system-ui, sans-serif', color: '#9ca3af' }}>Loading…</div>;
  }

  const { personal, parents, immigration, timeline, children, sources, discrepancies, potential, gaps } = data;

  const initials = personal.fullName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  const tags = data.tags ?? [personal.occupation, personal.religion].filter(v => v && v !== 'N/A');

  const stats = data.stats ?? [
    { label: 'Age at death',      value: personal.age !== 'N/A' ? personal.age.split(' ')[0] : '—', sub: personal.age !== 'N/A' ? personal.age : '' },
    { label: 'Children',          value: String(children.length), sub: '' },
    { label: 'Sources consulted', value: String(sources.length),  sub: '' },
    { label: 'Research gaps',     value: String(gaps.length),     sub: `${gaps.filter(g => g.priority === 'high').length} high priority` },
  ];

  const tabs = [
    { id: 'overview',  label: 'Overview' },
    { id: 'timeline',  label: 'Timeline' },
    { id: 'family',    label: 'Family' },
    { id: 'sources',   label: 'Sources' },
    { id: 'potential', label: 'Potential findings' },
    { id: 'gaps',      label: 'Research gaps' },
  ];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem', color: '#1f2937' }}>

      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', padding: '0 0 1.25rem', cursor: 'pointer', fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        ← Back
      </button>

      {/* Header */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: AMBER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, color: AMBER.text, flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, margin: '0 0 4px' }}>{personal.fullName}</h1>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            {[personal.born, personal.birthplace].filter(v => v && v !== 'N/A').join(', ')}
            {personal.died !== 'N/A' && ` → ${personal.died}`}
            {personal.deathPlace !== 'N/A' && `, ${personal.deathPlace}`}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((t: string) => (
              <span key={t} style={{ fontSize: 12, padding: '2px 10px', borderRadius: 12, background: AMBER.bg, color: AMBER.text }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        {stats.map((s: { label: string; value: string; sub: string }) => (
          <div key={s.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 6, border: `1px solid ${tab === t.id ? AMBER.border : '#e5e7eb'}`, background: tab === t.id ? AMBER.bg : '#f9fafb', color: tab === t.id ? AMBER.text : '#4b5563', cursor: 'pointer', fontWeight: tab === t.id ? 500 : 400 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div>
          <Section title="Personal details">
            <Card>
              {([
                ['Full name',         personal.fullName],
                ['Also known as',     personal.alsoKnownAs],
                ['Born',              personal.born],
                ['Birthplace',        personal.birthplace],
                ['Died',              personal.died],
                ['Death place',       personal.deathPlace],
                ['Age at death',      personal.age],
                ['Occupation',        personal.occupation],
                ['Religion',          personal.religion],
                ['Residence at death',personal.residence],
                ['Buried',            personal.buried],
                ['Probate',           personal.probate],
                ['Cause of death',    personal.causeOfDeath],
                ['Final illness',     personal.lastIllness],
              ] as [string, string][]).map(([k, v]) => (
                v && v !== 'N/A' ? <Row key={k} label={k} value={v} /> : null
              ))}
            </Card>
          </Section>

          <Section title="Parents">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <Card>
                <div style={{ padding: '10px 0' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Father</div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{parents.father.name}</div>
                  {parents.father.occupation && <div style={{ fontSize: 13, color: '#6b7280' }}>Occupation: {parents.father.occupation}</div>}
                  {parents.father.note && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{parents.father.note}</div>}
                </div>
              </Card>
              <Card>
                <div style={{ padding: '10px 0' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Mother</div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{parents.mother.name}</div>
                  {parents.mother.note && <div style={{ fontSize: 13, color: '#6b7280' }}>{parents.mother.note}</div>}
                </div>
              </Card>
            </div>
            {parents.note && <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{parents.note}</div>}
          </Section>

          {immigration && (
            <Section title="Immigration">
              <Card>
                {([
                  ['Departure',        immigration.departure],
                  ['Ship',             immigration.ship],
                  ['Hamburg list entry', immigration.hamburgEntry],
                  ['Voyage duration',  immigration.voyage],
                  ['Arrival',          immigration.arrival],
                  ['Arrival list entry', immigration.sydneyEntry],
                  ['Years in Victoria', immigration.yearsInVictoria],
                ] as [string, string][]).map(([k, v]) => (
                  v && v !== 'N/A' ? <Row key={k} label={k} value={v} /> : null
                ))}
              </Card>
            </Section>
          )}

          {data.crossReferences && data.crossReferences.length > 0 && (
            <Section title="Related research profiles">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.crossReferences.map(ref => (
                  <button
                    key={ref.personId}
                    onClick={() => navigate(`/profile/${ref.personId}`)}
                    style={{
                      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                      padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = AMBER.border)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                  >
                    <div style={{ minWidth: 72, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: AMBER.bg, color: AMBER.text, fontWeight: 500 }}>
                        {ref.relationship}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 2 }}>{ref.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{ref.keyFacts}</div>
                    </div>
                    <div style={{ fontSize: 11, color: AMBER.text, flexShrink: 0, alignSelf: 'center' }}>View →</div>
                  </button>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ── Timeline ── */}
      {tab === 'timeline' && (
        <Section title="Life timeline">
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            <div style={{ position: 'absolute', left: 4, top: 6, bottom: 6, width: 1, background: '#e5e7eb' }} />
            {timeline.map((item, i) => (
              <div key={i} style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <div style={{ position: 'absolute', left: -20, top: 5, width: item.key ? 11 : 9, height: item.key ? 11 : 9, borderRadius: '50%', background: item.key ? AMBER.text : AMBER.bg, border: `1px solid ${AMBER.text}` }} />
                <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 2 }}>{item.year}</div>
                <div style={{ fontSize: 14, color: '#111827', lineHeight: 1.5 }}>{item.event}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2, lineHeight: 1.5 }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Family ── */}
      {tab === 'family' && (
        <div>
          {data.marriage && data.marriage.length > 0 && (
            <Section title="Marriage">
              <Card>
                {data.marriage.map(({ label, value }) => (
                  <Row key={label} label={label} value={value} />
                ))}
              </Card>
            </Section>
          )}
          {children.length > 0 && (
            <Section title="Children">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 8 }}>
                {children.map(c => (
                  <div key={c.name} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                    {(c.born || c.died) && (
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {c.born ?? '?'}–{c.died ?? '?'}
                      </div>
                    )}
                    {c.age !== null && (
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>Age {c.age} at subject's death</div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}
          {!data.marriage && children.length === 0 && (
            <div style={{ fontSize: 13, color: '#9ca3af' }}>No family data recorded.</div>
          )}
        </div>
      )}

      {/* ── Sources ── */}
      {tab === 'sources' && (
        <div>
          <Section title="Sources consulted">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 10 }}>
              {sources.map(s => (
                <div key={s.title} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
          {discrepancies.length > 0 && (
            <Section title="Noted discrepancies">
              <Card>
                {discrepancies.map(d => <Row key={d.field} label={d.field} value={d.detail} />)}
              </Card>
            </Section>
          )}
        </div>
      )}

      {/* ── Potential findings ── */}
      {tab === 'potential' && (
        <Section title="Potential (unconfirmed) findings">
          {potential.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No potential findings recorded yet.</p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: '1rem' }}>
                These records have not been confirmed as relating to this person or their family. Logged here for future investigation.
              </p>
              {potential.map((p, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `3px solid ${p.badgeBg}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: p.badgeBg, color: p.badgeColor, fontWeight: 500 }}>{p.badge}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{p.sources}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#111827', lineHeight: 1.6, marginBottom: 4 }}>{p.text}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>{p.note}</div>
                </div>
              ))}
            </>
          )}
        </Section>
      )}

      {/* ── Research gaps ── */}
      {tab === 'gaps' && (
        <div>
          {gaps.filter(g => g.priority === 'high').length > 0 && (
            <Section title="High priority research gaps">
              {gaps.filter(g => g.priority === 'high').map(g => (
                <GapItem key={g.num} gap={g} color={CORAL} />
              ))}
            </Section>
          )}
          {gaps.filter(g => g.priority === 'medium').length > 0 && (
            <Section title="Medium priority">
              {gaps.filter(g => g.priority === 'medium').map(g => (
                <GapItem key={g.num} gap={g} color={GRAY} />
              ))}
            </Section>
          )}
          {gaps.length === 0 && (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No research gaps recorded yet.</p>
          )}
        </div>
      )}

    </div>
  );
}
