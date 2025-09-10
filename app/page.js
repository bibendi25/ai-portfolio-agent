'use client';
import { useEffect, useMemo, useState } from 'react';

async function api(payload) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: false, error: 'Bad JSON from API' }; }
}

async function getSettings() {
  try {
    const r = await fetch('/api/settings');
    return await r.json();
  } catch (e) {
    return { hero: 'Talk to my work', footerNote: '' };
  }
}

export default function Page() {
  // Inputs
  const [q, setQ] = useState('');
  const [jd, setJd] = useState('');
  const [sel, setSel] = useState('');

  // Data
  const [projects, setProjects] = useState([]);
  const [others, setOthers] = useState([]);
  const [hits, setHits] = useState([]);
  const [note, setNote] = useState('');
  const [md, setMd] = useState('');
  const [cfg, setCfg] = useState(null);

  // UI state
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [loadingCover, setLoadingCover] = useState(false);
  const [loadingCase, setLoadingCase] = useState(false);

  // Rotating tips (ASCII only)
  const tips = useMemo(() => [
    'What did you do on HSBC payments?',
    'How did you improve Mercedes-Benz IA?',
    'Tell me about SRF (Swiss broadcaster).',
    'What was your role on Barclaycard ID&V?',
    'What is La Casa Shambala?',
  ], []);
  const [tipIdx, setTipIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 5000);
    return () => clearInterval(t);
  }, [tips.length]);

  // Init
  useEffect(() => {
    (async () => {
      const [list, settings] = await Promise.all([api({ mode: 'list' }), getSettings()]);
      if (list && list.ok) {
        setProjects(list.projects || []);
        setOthers(list.others || []);
        setSel((list.projects && list.projects[0]) || '');
      }
      setCfg(settings || {});
    })();
  }, []);

  // Helpers
  const copyToClipboard = async (text) => {
    try { await navigator.clipboard.writeText(text); alert('Copied to clipboard'); }
    catch { alert('Copy failed'); }
  };
  const downloadMd = (filename, content) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <div className="hero">
        <h1>{(cfg && cfg.hero) || 'Talk to my work'}</h1>
        <p className="muted">
          {(cfg && cfg.footerNote) || 'All answers cite only the files listed in Sources. No external data is used.'}
        </p>
      </div>

      <div className="row">
        {/* Ask about my work */}
        <div className="col">
          <div className="card">
            <h3>Ask about my work</h3>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (async () => {
                    setLoadingAsk(true);
                    const resp = await api({ mode: 'ask', q });
                    setLoadingAsk(false);
                    if (!resp.ok && resp.error) { alert(resp.error); return; }
                    setHits(resp.hits || []);
                  })();
                }
              }}
              placeholder={'e.g. "' + tips[tipIdx] + '"'}
            />
            <div className="btnRow">
              <button className="btn primary" onClick={async () => {
                setLoadingAsk(true);
                const resp = await api({ mode: 'ask', q });
                setLoadingAsk(false);
                if (!resp.ok && resp.error) { alert(resp.error); return; }
                setHits(resp.hits || []);
              }}>
                {loadingAsk ? <span className="spinner" aria-label="Loading" /> : 'Answer'}
              </button>
              <small className="muted">Tip: try HSBC, Mercedes-Benz, SRF, Barclaycard, JEWZY, La Casa Shambala.</small>
            </div>

            <hr />
            {hits && hits.length > 0 ? hits.map((h, i) => (
              <div key={i} className="answer">
                {h.p}
                <div className="source">
                  Source: <a href={'/docs/' + h.source} target="_blank" rel="noreferrer"><code>{h.source}</code></a>
                </div>
              </div>
            )) : <small className="muted">No matches yet. Ask a question that uses terms from the Sources list (below).</small>}
          </div>
        </div>

        {/* Cover note */}
        <div className="col">
          <div className="card">
            <h3>Tailored cover note</h3>
            <textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste a job description here..." />
            <div className="btnRow">
              <button className="btn primary" onClick={async () => {
                setLoadingCover(true);
                const resp = await api({ mode: 'cover', jd });
                setLoadingCover(false);
                if (!resp.ok && resp.error) { alert(resp.error); return; }
                setNote(resp.note || '');
              }}>
                {loadingCover ? <span className="spinner" aria-label="Loading" /> : 'Generate'}
              </button>

              {note ? (
                <>
                  <button className="btn secondary" onClick={() => copyToClipboard(note)}>Copy</button>
                  <button className="btn ghost" onClick={() => downloadMd('cover-note.md', note)}>Download .md</button>
                </>
              ) : null}
            </div>
            {note ? (<><hr /><div className="answer">{note}</div></>) : null}
          </div>
        </div>
      </div>

      <div className="row">
        {/* Case study */}
        <div className="col">
          <div className="card">
            <h3>Case study generator</h3>
            <select value={sel} onChange={e => setSel(e.target.value)}>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="btnRow">
              <button className="btn primary" onClick={async () => {
                setLoadingCase(true);
                const resp = await api({ mode: 'case', project: sel });
                setLoadingCase(false);
                if (!resp.ok && resp.error) { alert(resp.error); return; }
                setMd(resp.md || '');
              }}>
                {loadingCase ? <span className="spinner" aria-label="Loading" /> : 'Create'}
              </button>

              {md ? (
                <>
                  <button className="btn secondary" onClick={() => copyToClipboard(md)}>Copy</button>
                  <button className="btn ghost" onClick={() => downloadMd((sel.split('/').pop() || 'case-study').replace('.md', '-case.md'), md)}>Download .md</button>
                </>
              ) : null}
            </div>
            {md ? (<><hr /><div className="answer">{md}</div></>) : null}
          </div>
        </div>

        {/* Sources */}
        <div className="col">
          <div id="sources" className="card">
            <h3>Sources</h3>
            <p className="muted">These are the only files used by the agent:</p>
            <ul>
              {projects.map(p => (
                <li key={'p-' + p}>
                  <a href={'/docs/' + p} target="_blank" rel="noreferrer"><code>{p}</code></a>
                </li>
              ))}
              {others.map(o => (
                <li key={'o-' + o}>
                  <a href={'/docs/' + o} target="_blank" rel="noreferrer"><code>{o}</code></a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="muted" style={{ marginTop: 16 }}>
        &copy; {new Date().getFullYear()} Ed Birchmore &middot; Built as a portfolio agent demo.
      </p>
    </div>
  );
}
