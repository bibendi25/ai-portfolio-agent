
'use client';
import { useEffect, useState } from 'react';
async function api(payload){ const r=await fetch('/api/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); return r.json(); }
async function getSettings(){ const r=await fetch('/api/settings'); return r.json(); }
export default function Page(){
  const [q,setQ]=useState(''); const [hits,setHits]=useState([]); const [jd,setJd]=useState(''); const [note,setNote]=useState('');
  const [projects,setProjects]=useState([]); const [others,setOthers]=useState([]); const [sel,setSel]=useState(''); const [md,setMd]=useState(''); const [cfg,setCfg]=useState(null);
  useEffect(()=>{(async()=>{const [l,s]=await Promise.all([api({mode:'list'}),getSettings()]); if(l.ok){setProjects(l.projects); setOthers(l.others); setSel(l.projects?.[0]||'')} setCfg(s)})()},[]);
  return (<div className="container">
    <h1>{cfg?.hero||'Talk to my work'}</h1>
    <div className="row">
      <div className="col"><div className="card">
        <h3>Ask about my work</h3>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder='e.g. "What did you do on HSBC payments?"'/>
        <button className="primary" onClick={async()=>{
  const resp = await api({mode:'ask', q});
  if(!resp.ok && resp.error){ alert('API error: ' + resp.error); return; }
  setHits(resp.hits || []);
}}>Answer</button>

        {hits.length? hits.map((h,i)=>(<div key={i}><pre>{h.p}</pre><small>source: {h.source}</small><hr/></div>)) : <small>Tip: HSBC, Mercedes‑Benz, SRF, Barclaycard, JEWZY, La Casa Shambala.</small>}
      </div></div>
      <div className="col"><div className="card">
        <h3>Tailored cover note</h3>
        <textarea rows={10} value={jd} onChange={e=>setJd(e.target.value)} placeholder="Paste JD here…"/>
        <button onClick={async()=>{const r=await api({mode:'cover',jd}); setNote(r.note||'')}}>Generate</button>
        {note && (<><hr/><pre>{note}</pre></>)}
      </div></div>
    </div>
    <div className="row">
      <div className="col"><div className="card">
        <h3>Case study generator</h3>
        <select value={sel} onChange={e=>setSel(e.target.value)}>{projects.map(p=><option key={p} value={p}>{p}</option>)}</select>
        <button onClick={async()=>{const r=await api({mode:'case',project:sel}); setMd(r.md||'')}}>Create</button>
        {md && (<><hr/><pre>{md}</pre></>)}
      </div></div>
      <div className="col"><div className="card">
        <h3>Sources</h3>
        <ul>{projects.map(p=><li key={'p-'+p}><code>{p}</code></li>)}{others.map(o=><li key={'o-'+o}><code>{o}</code></li>)}</ul>
      </div></div>
    </div>
  </div>);
}
