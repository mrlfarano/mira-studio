import React, { useEffect, useCallback, useState } from 'react';
import { useSIStore } from '@/store/si-store';
import type { SIBuild, SILesson, SIHypothesis } from '@/store/si-store';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const columnStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 200,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 8,
  background: '#12121a',
  borderRadius: 6,
  overflow: 'auto',
};

const columnHeaderStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: '#888',
  marginBottom: 4,
  paddingBottom: 4,
  borderBottom: '1px solid #2a2a3a',
};

const cardStyle: React.CSSProperties = {
  background: '#1a1a2e',
  border: '1px solid #2a2a3a',
  borderRadius: 4,
  padding: '6px 8px',
  fontSize: 12,
  lineHeight: 1.4,
};

const tagStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  fontSize: 10,
  fontWeight: 600,
  padding: '1px 6px',
  borderRadius: 3,
  background: color,
  color: '#fff',
  marginRight: 4,
});

const healthBarOuter: React.CSSProperties = {
  height: 6,
  background: '#222',
  borderRadius: 3,
  overflow: 'hidden',
  marginTop: 4,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const BuildCard: React.FC<{ build: SIBuild }> = ({ build }) => (
  <div style={cardStyle}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
      <span style={{ fontWeight: 600, color: '#ccc' }}>{build.branch}</span>
      <span style={tagStyle(build.accepted ? '#2d6a4f' : '#9b2226')}>
        {build.accepted ? 'Accepted' : 'Rejected'}
      </span>
    </div>
    <div style={{ color: '#999', fontSize: 11 }}>{build.outcome}</div>
    <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>
      {new Date(build.date).toLocaleDateString()}
    </div>
  </div>
);

const LessonCard: React.FC<{ lesson: SILesson }> = ({ lesson }) => {
  const sourceColors: Record<string, string> = {
    mira: '#7b2cbf',
    agent: '#0077b6',
    user: '#e07a22',
  };
  return (
    <div style={cardStyle}>
      <span style={tagStyle(sourceColors[lesson.source] ?? '#555')}>
        {lesson.source}
      </span>
      <span style={{ color: '#ccc' }}>{lesson.content}</span>
      <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>
        {new Date(lesson.date).toLocaleDateString()}
      </div>
    </div>
  );
};

const HypothesisCard: React.FC<{ hypothesis: SIHypothesis }> = ({ hypothesis }) => {
  const impactColors: Record<string, string> = {
    low: '#555',
    medium: '#b08d1a',
    high: '#c0392b',
  };
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontWeight: 600, color: '#ccc' }}>{hypothesis.title}</span>
        <span style={tagStyle(impactColors[hypothesis.impact] ?? '#555')}>
          {hypothesis.impact}
        </span>
      </div>
      <div style={{ color: '#999', fontSize: 11 }}>{hypothesis.description}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SIPanel — three-column layout
// ---------------------------------------------------------------------------

const SIPanel: React.FC = () => {
  const {
    hypotheses,
    lessons,
    builds,
    health,
    loading,
    error,
    fetchAll,
    fetchHealth,
    addHypothesis,
    addLesson,
  } = useSIStore();

  const [showHypForm, setShowHypForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);

  useEffect(() => {
    fetchAll();
    fetchHealth();
  }, [fetchAll, fetchHealth]);

  // --- Quick-add forms (kept minimal) ---

  const handleAddHypothesis = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      await addHypothesis({
        title: fd.get('title') as string,
        description: fd.get('description') as string,
        impact: (fd.get('impact') as 'low' | 'medium' | 'high') || 'medium',
        status: 'queued',
      });
      form.reset();
      setShowHypForm(false);
    },
    [addHypothesis],
  );

  const handleAddLesson = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      await addLesson({
        content: fd.get('content') as string,
        source: (fd.get('source') as 'mira' | 'agent' | 'user') || 'user',
      });
      form.reset();
      setShowLessonForm(false);
    },
    [addLesson],
  );

  // Filter hypotheses for "What's Next" column
  const queuedHypotheses = hypotheses.filter(
    (h) => h.status === 'queued' || h.status === 'testing',
  );

  const healthColor =
    health && health.score >= 60 ? '#2d6a4f' : health && health.score >= 30 ? '#b08d1a' : '#9b2226';

  if (loading && builds.length === 0) {
    return <div style={{ padding: 16, color: '#888' }}>Loading SI data...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      {/* Health bar */}
      {health && (
        <div style={{ padding: '4px 8px', fontSize: 11, color: '#888' }}>
          SI Health: {health.score}/100
          <div style={healthBarOuter}>
            <div
              style={{
                width: `${health.score}%`,
                height: '100%',
                background: healthColor,
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '4px 8px', fontSize: 11, color: '#c0392b' }}>{error}</div>
      )}

      {/* Three-column layout */}
      <div style={{ display: 'flex', gap: 8, flex: 1, overflow: 'hidden', padding: '0 4px 4px' }}>
        {/* Column 1: What We Built */}
        <div style={columnStyle}>
          <div style={columnHeaderStyle}>What We Built</div>
          {builds.length === 0 && (
            <div style={{ color: '#555', fontSize: 11 }}>No builds recorded yet.</div>
          )}
          {[...builds].reverse().map((b) => (
            <BuildCard key={b.id} build={b} />
          ))}
        </div>

        {/* Column 2: What We Learned */}
        <div style={columnStyle}>
          <div style={{ ...columnHeaderStyle, display: 'flex', justifyContent: 'space-between' }}>
            <span>What We Learned</span>
            <button
              onClick={() => setShowLessonForm((v) => !v)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: 14,
              }}
              aria-label="Add lesson"
            >
              +
            </button>
          </div>
          {showLessonForm && (
            <form onSubmit={handleAddLesson} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input name="content" placeholder="What did we learn?" required style={inputStyle} />
              <select name="source" style={inputStyle}>
                <option value="user">User</option>
                <option value="mira">Mira</option>
                <option value="agent">Agent</option>
              </select>
              <button type="submit" style={submitBtnStyle}>Add Lesson</button>
            </form>
          )}
          {lessons.length === 0 && !showLessonForm && (
            <div style={{ color: '#555', fontSize: 11 }}>No lessons captured yet.</div>
          )}
          {[...lessons].reverse().map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </div>

        {/* Column 3: What's Next */}
        <div style={columnStyle}>
          <div style={{ ...columnHeaderStyle, display: 'flex', justifyContent: 'space-between' }}>
            <span>What&apos;s Next</span>
            <button
              onClick={() => setShowHypForm((v) => !v)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: 14,
              }}
              aria-label="Add hypothesis"
            >
              +
            </button>
          </div>
          {showHypForm && (
            <form onSubmit={handleAddHypothesis} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input name="title" placeholder="Hypothesis title" required style={inputStyle} />
              <input name="description" placeholder="Description" style={inputStyle} />
              <select name="impact" style={inputStyle}>
                <option value="medium">Medium Impact</option>
                <option value="high">High Impact</option>
                <option value="low">Low Impact</option>
              </select>
              <button type="submit" style={submitBtnStyle}>Add Hypothesis</button>
            </form>
          )}
          {queuedHypotheses.length === 0 && !showHypForm && (
            <div style={{ color: '#555', fontSize: 11 }}>No queued hypotheses.</div>
          )}
          {queuedHypotheses.map((h) => (
            <HypothesisCard key={h.id} hypothesis={h} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Form styles
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  background: '#0e0e16',
  border: '1px solid #333',
  borderRadius: 3,
  padding: '4px 6px',
  fontSize: 11,
  color: '#ccc',
  outline: 'none',
};

const submitBtnStyle: React.CSSProperties = {
  background: '#2d6a4f',
  border: 'none',
  borderRadius: 3,
  padding: '4px 8px',
  fontSize: 11,
  color: '#fff',
  cursor: 'pointer',
};

export default React.memo(SIPanel);
