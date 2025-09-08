
'use client';
import { useEffect, useState } from 'react';

async function api(payload){
  const res = await fetch('/api/query', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
  return res.json();
}
async function getSettings(){
  const res = await fetch('/api/settings'); return res.json();
}

export default function Page(){
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [jd, setJd] = useState('');
  const [note, setNote] = useState('');
  const [projects, setProjects] = useState([]);
  const [others, setOthers] = useState([]);
  const [sel, setSel] = useState('');
  const [md, setMd] = useState('');
  const [cfg, setCfg] = useState(null);

  useEffect(()=>{ (async()=>{
    const [resp, settings] = await Promise.all([api({mode:'list'}), getSettings()]);
    if(resp.ok){ setProjects(resp.projects); setOthers(resp.others); setSel(resp.projects?.[0] || ''); }
    setCfg(settings);
  })(); }, []);

  return (
    <div className="container">
      <div className="hero">
        <span className="badge">Live demo</span>
        <h1>{cfg?.hero || 'Talk to my work'}</h1>
        <p className="muted">{cfg?.footerNote || 'All answers cite local docs only.'}</p>
      </div>

      <div className="row">
        <div className="col">
          <div className="card">
            <h3>Ask about my work</h3>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder='e.g. "What did you do on HSBC payments?"' />
            <button className="primary" onClick={async()=>{
              const resp = await api({mode:'ask', q});
              setHits(resp.hits || []);
            }}>Answer</button>
            <hr/>
            {hits.length ? hits.map((h,i)=> (
              <div key={i}>
                <blockquote>{h.p}</blockquote>
                <small>source: {h.source}</small>
                <hr/>
              </div>
            )): <small>Tip: try HSBC, Mercedes‑Benz, SRF, Barclaycard, JEWZY, La Casa Shambala.</small>}
          </div>
        </div>

        <div className="col">
          <div className="card">
            <h3>Tailored cover note</h3>
            <textarea value={jd} onChange={e=>setJd(e.target.value)} placeholder="Paste JD here…" rows={10}/>
            <button className="primary" onClick={async()=>{
              const resp = await api({mode:'cover', jd});
              setNote(resp.note || '');
            }}>Generate</button>
            {note && (<><hr/><pre>{note}</pre></>)}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col">
          <div className="card">
            <h3>Case study generator</h3>
            <select value={sel} onChange={e=>setSel(e.target.value)}>
              {projects.map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={async()=>{
              const resp = await api({mode:'case', project: sel});
              setMd(resp.md || '');
            }}>Create</button>
            {md && (<><hr/><pre>{md}</pre></>)}
          </div>
        </div>

        <div className="col">
          <div id="sources" className="card">
            <h3>Sources</h3>
            <p className="muted">These are the only files used by the agent:</p>
            <ul>
              {projects.map(p=> <li key={'p-'+p}><code>{p}</code></li>)}
              {others.map(o=> <li key={'o-'+o}><code>{o}</code></li>)}
            </ul>
          </div>
        </div>
      </div>

      <div className="footer">
        <small>© {new Date().getFullYear()} {cfg?.name || 'Ed Birchmore'} — {cfg?.tagline || ''}</small>
      </div>
    </div>
  );
}
