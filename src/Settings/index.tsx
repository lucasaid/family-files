import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { writeSettings, AI_ENABLED } from '../utils/settings';
import { fcName } from '../utils/people';
import Modal from '../components/Modal';
import { getProvider, RECOMMENDED_MODELS, pullModel, deleteModel } from '../utils/ai';
import type { AIModel } from '../utils/ai';

function Tip({ kbd, children }: { kbd: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{
        flexShrink: 0,
        fontSize: 10, fontWeight: 600,
        background: 'var(--bg)', border: '1px solid var(--border-muted)',
        borderRadius: 4, padding: '1px 6px',
        color: 'var(--text-2)', letterSpacing: '0.03em',
        fontFamily: 'var(--font-mono)',
      }}>
        {kbd}
      </span>
      <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', lineHeight: 1.4 }}>{children}</span>
    </div>
  );
}

interface Props {
  onClose: () => void;
}

function AISettingsSection() {
  const { state, dispatch } = useAppContext();
  const s = state.settings;
  const isOllama = s.aiProvider === 'ollama';
  const ollamaUrl = s.aiOllamaUrl ?? 'http://localhost:11434';

  const [installedModels, setInstalledModels] = useState<AIModel[] | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [downloadId, setDownloadId] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const isOnline = navigator.onLine;

  async function save(patch: Partial<typeof s>) {
    const updated = { ...s, ...patch };
    dispatch({ type: 'SET_SETTINGS', settings: updated });
    await writeSettings(updated);
  }

  async function loadModels() {
    try {
      const provider = getProvider({ ...s, aiProvider: 'ollama' });
      const models = await provider!.listModels();
      setInstalledModels(models);
    } catch {
      setInstalledModels([]);
    }
  }

  React.useEffect(() => {
    if (isOllama) loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOllama, ollamaUrl]);

  async function testConnection() {
    setTestStatus('testing');
    try {
      const provider = getProvider({ ...s, aiProvider: 'ollama' });
      setTestStatus((await provider!.isAvailable()) ? 'ok' : 'error');
    } catch {
      setTestStatus('error');
    }
    setTimeout(() => setTestStatus('idle'), 3000);
  }

  async function handleDownload() {
    if (!downloadId) return;
    setDownloadProgress(0);
    setDownloadError(null);
    try {
      await pullModel(ollamaUrl, downloadId, pct => setDownloadProgress(pct));
      setDownloadProgress(null);
      setDownloadId('');
      await loadModels();
    } catch (e) {
      setDownloadError((e as Error).message);
      setDownloadProgress(null);
    }
  }

  async function handleDelete(modelId: string) {
    try {
      await deleteModel(ollamaUrl, modelId);
      await loadModels();
    } catch { /* best-effort */ }
  }

  const visionModels = useMemo(
    () => (installedModels ?? []).filter(m => m.supportsVision),
    [installedModels]
  );
  const downloadable = useMemo(
    () => RECOMMENDED_MODELS.filter(
      rm => !(installedModels ?? []).some(
        im => im.id === rm.id || im.id.split(':')[0] === rm.id.split(':')[0]
      )
    ),
    [installedModels]
  );

  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
  const fieldLbl: React.CSSProperties = { fontSize: 'var(--font-size-ui)', color: 'var(--text-3)', minWidth: 100, flexShrink: 0 };
  const inp: React.CSSProperties = {
    flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 3, padding: '3px 7px', color: 'var(--input-text)',
    fontSize: 'var(--font-size-ui)', fontFamily: 'inherit',
  };
  const sel: React.CSSProperties = { ...inp, flex: 'none', minWidth: 160 };
  const btnSm: React.CSSProperties = {
    background: 'var(--btn-cancel-bg)', border: '1px solid var(--btn-cancel-border)',
    borderRadius: 3, padding: '3px 9px', fontSize: 'var(--font-size-label)',
    cursor: 'pointer', color: 'var(--btn-cancel-text)', flexShrink: 0,
  };

  return (
    <div>
      <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
        AI Integration
      </div>

      {/* Provider selector */}
      <div style={{ ...row, marginBottom: 14 }}>
        <span style={fieldLbl}>Provider</span>
        <select style={sel} value={s.aiProvider ?? ''} onChange={e => save({ aiProvider: e.target.value || null })}>
          <option value="">Disabled</option>
          <option value="ollama">Ollama (local)</option>
        </select>
        <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', opacity: 0.45 }}>
          Claude API — coming soon
        </span>
      </div>

      {isOllama && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 10, borderLeft: '2px solid var(--border-muted)' }}>

          {/* URL + Test */}
          <div style={row}>
            <span style={fieldLbl}>URL</span>
            <input style={inp} value={ollamaUrl} onChange={e => save({ aiOllamaUrl: e.target.value })} placeholder="http://localhost:11434" />
            <button style={btnSm} onClick={testConnection} disabled={testStatus === 'testing'}>
              {testStatus === 'testing' ? 'Testing…' : testStatus === 'ok' ? '✓ OK' : testStatus === 'error' ? '✗ Error' : 'Test'}
            </button>
          </div>

          {/* Keywords model (vision only) */}
          <div style={row}>
            <span style={fieldLbl}>Keywords model</span>
            <select style={sel} value={s.aiOllamaKeywordsModel ?? ''} onChange={e => save({ aiOllamaKeywordsModel: e.target.value || undefined })}>
              <option value="">— select —</option>
              {visionModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)' }}>vision only</span>
          </div>

          {/* Summary model (all) */}
          <div style={row}>
            <span style={fieldLbl}>Summary model</span>
            <select style={sel} value={s.aiOllamaSummaryModel ?? ''} onChange={e => save({ aiOllamaSummaryModel: e.target.value || undefined })}>
              <option value="">— select —</option>
              {(installedModels ?? []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Installed models */}
          {installedModels && installedModels.length > 0 && (
            <div>
              <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', marginBottom: 5 }}>Installed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {installedModels.map(m => (
                  <div key={m.id} style={row}>
                    <span style={{ flex: 1, fontSize: 'var(--font-size-ui)', color: 'var(--text-2)' }}>{m.name}</span>
                    {m.sizeGb && <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)' }}>{m.sizeGb.toFixed(1)} GB</span>}
                    {m.supportsVision && (
                      <span style={{ fontSize: 9, background: 'var(--tag-bg)', border: '1px solid var(--tag-border)', borderRadius: 8, padding: '1px 6px', color: 'var(--accent)' }}>vision</span>
                    )}
                    <button style={btnSm} onClick={() => handleDelete(m.id)}>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download */}
          {downloadable.length > 0 && (
            <div>
              <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', marginBottom: 5 }}>Download a model</div>
              <div style={row}>
                <select style={sel} value={downloadId} onChange={e => setDownloadId(e.target.value)}>
                  <option value="">— select —</option>
                  {downloadable.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.sizeGb?.toFixed(1)} GB){m.supportsVision ? ' · vision' : ''}
                    </option>
                  ))}
                </select>
                <button
                  style={{ ...btnSm, background: 'var(--btn-primary-bg)', border: '1px solid var(--btn-primary-border)', color: 'var(--btn-primary-text)' }}
                  onClick={handleDownload}
                  disabled={!downloadId || downloadProgress !== null || !isOnline}
                >
                  {downloadProgress !== null ? 'Downloading…' : 'Download'}
                </button>
              </div>
              {downloadProgress !== null && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ background: 'var(--accent)', height: '100%', width: `${downloadProgress}%`, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', marginTop: 3 }}>{downloadProgress}%</div>
                </div>
              )}
              {downloadError && (
                <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-error)', marginTop: 4 }}>{downloadError}</div>
              )}
            </div>
          )}

          {/* Connectivity notice */}
          {!isOnline && (
            <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-3)', background: 'var(--bg-elevated)', borderRadius: 4, padding: '8px 10px', lineHeight: 1.5 }}>
              ⚠ You are offline. Ollama inference works without internet. Model downloads require a connection.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsModal({ onClose }: Props) {
  const { state, dispatch } = useAppContext();
  const [query, setQuery] = useState('');

  const currentStart = state.settings.familyTreeStartId
    ? state.familyChart?.find(fc => fc.id === state.settings.familyTreeStartId) ?? null
    : null;

  const candidates = useMemo(() => {
    if (!state.familyChart) return [];
    const q = query.toLowerCase();
    if (!q) return [...state.familyChart].sort((a, b) => fcName(a).localeCompare(fcName(b)));
    return state.familyChart
      .filter(fc => fcName(fc).toLowerCase().includes(q))
      .sort((a, b) => {
        const aFirst = a.data['first name'].toLowerCase().startsWith(q);
        const bFirst = b.data['first name'].toLowerCase().startsWith(q);
        if (aFirst !== bFirst) return aFirst ? -1 : 1;
        return fcName(a).localeCompare(fcName(b));
      });
  }, [state.familyChart, query]);

  async function select(id: string | undefined) {
    const updated = { ...state.settings, familyTreeStartId: id };
    dispatch({ type: 'SET_SETTINGS', settings: updated });
    await writeSettings(updated);
    setQuery('');
  }

  return (
    <Modal title="Settings" onClose={onClose} width={480} maxHeight="80vh">
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Setting: photos always in edit mode */}
        <div>
          <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
            Photos
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!state.settings.photosAlwaysEdit}
              onChange={async e => {
                const updated = { ...state.settings, photosAlwaysEdit: e.target.checked };
                dispatch({ type: 'SET_SETTINGS', settings: updated });
                await writeSettings(updated);
              }}
              style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            <div>
              <div style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-1)' }}>Always show edit fields</div>
              <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', marginTop: 2 }}>
                Photo metadata is always editable — no need to click Edit first.
              </div>
            </div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 10 }}>
            <input
              type="checkbox"
              checked={!!state.settings.photosSaveOnNavigate}
              onChange={async e => {
                const updated = { ...state.settings, photosSaveOnNavigate: e.target.checked };
                dispatch({ type: 'SET_SETTINGS', settings: updated });
                await writeSettings(updated);
              }}
              style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            <div>
              <div style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-1)' }}>Save on navigate away</div>
              <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', marginTop: 2 }}>
                Automatically save unsaved metadata changes when switching to another photo.
              </div>
            </div>
          </label>

          {(state.settings.photosAlwaysEdit || state.settings.photosSaveOnNavigate) && (
            <div style={{
              marginTop: 14,
              padding: '10px 12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-muted)',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--text-3)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase' }}>
                How it works
              </div>
              <Tip kbd="⌥ ← / ⌥ →">
                Navigate to the previous or next photo from any metadata field.
              </Tip>
              {state.settings.photosAlwaysEdit && (
                <Tip kbd="↵ Enter">
                  Save changes from any single-line field without clicking Save.
                </Tip>
              )}
              {state.settings.photosSaveOnNavigate && (
                <Tip kbd="Auto-save">
                  Any unsaved changes are written to the file automatically when you navigate away.
                </Tip>
              )}
            </div>
          )}
        </div>

        {/* Setting: family tree start point */}
        <div>
          <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
            Family Tree Start Point
          </div>
          <div style={{ fontSize: 'var(--font-size-ui)', color: 'var(--text-4)', marginBottom: 12 }}>
            The person shown at the centre of the tree when you open Family Tree.
          </div>

          {/* Current selection */}
          {currentStart ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', marginBottom: 12,
              background: 'var(--bg-card)', border: '1px solid var(--accent)',
              borderRadius: 6,
            }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, color: 'var(--text-1)' }}>{fcName(currentStart)}</div>
                {currentStart.data.birthday && (
                  <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', marginTop: 2 }}>b. {currentStart.data.birthday}</div>
                )}
              </div>
              <button
                onClick={() => select(undefined)}
                className="btn-ghost-hover"
                style={{ background: 'none', border: '1px solid var(--border-muted)', borderRadius: 4, padding: '3px 9px', fontSize: 'var(--font-size-label)', cursor: 'pointer', color: 'var(--text-4)' }}
              >
                Clear
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 'var(--font-size-ui)', color: 'var(--text-4)', fontStyle: 'italic', marginBottom: 12 }}>
              No start point set — tree opens on the first person in the file.
            </div>
          )}

          {/* Search — only shown when no start point is set */}
          {!currentStart && state.familyChart && state.familyChart.length > 0 && (
            <div style={{ border: '1px solid var(--border-muted)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--border-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 'var(--font-size-ui)', color: 'var(--text-4)' }}>⌕</span>
                <input
                  autoFocus
                  type="text"
                  placeholder="Search family tree…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  style={{ flex: 1, background: 'none', border: 'none', fontSize: 'var(--font-size-body)', color: 'var(--text-1)' }}
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="btn-ghost-hover" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 'var(--font-size-title)', lineHeight: 1, padding: 0 }}>×</button>
                )}
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {candidates.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 'var(--font-size-body)', color: 'var(--text-4)' }}>No matches</div>
                ) : (
                  candidates.map(fc => {
                    const isSelected = fc.id === state.settings.familyTreeStartId;
                    return (
                      <button
                        key={fc.id}
                        onClick={() => select(isSelected ? undefined : fc.id)}
                        className="btn-ghost-hover"
                        style={{
                          width: '100%', textAlign: 'left', background: isSelected ? 'var(--bg-elevated)' : 'none',
                          border: 'none', borderBottom: '1px solid var(--border-muted)',
                          padding: '9px 14px', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                        }}
                      >
                        <span style={{ fontSize: 'var(--font-size-body)', color: isSelected ? 'var(--accent)' : 'var(--text-1)' }}>
                          {fcName(fc)}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          {fc.data.birthday && (
                            <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)' }}>b. {fc.data.birthday}</span>
                          )}
                          {isSelected && (
                            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', color: 'var(--accent)' }}>Selected</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {!currentStart && !state.familyChart && (
            <div style={{ fontSize: 'var(--font-size-ui)', color: 'var(--text-4)', fontStyle: 'italic' }}>
              No family tree loaded — add a family-tree.ged file to enable this setting.
            </div>
          )}
        </div>

        {/* AI Integration */}
        {AI_ENABLED && (
          <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: 20 }}>
            <AISettingsSection />
          </div>
        )}
      </div>
    </Modal>
  );
}
