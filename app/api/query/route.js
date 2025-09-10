export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/** Resolve /public/docs even if Vercel “Root Directory” was mis-set (e.g. to /app) */
function resolveDocsDir() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'public', 'docs'),
    path.join(cwd, '..', 'public', 'docs'),
    path.join(cwd, '..', '..', 'public', 'docs'),
  ];
  for (const d of candidates) {
    try { if (fs.existsSync(d)) return d; } catch {}
  }
  return null;
}

/** Safe, recursive read of docs */
function readAllDocs(docsDir) {
  if (!docsDir) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(md|mdx)$/i.test(entry.name)) {
        out.push({ path: path.relative(docsDir, p).replace(/\\+/g,'/'), text: fs.readFileSync(p, 'utf8') });
      } else if (/\.pdf$/i.test(entry.name)) {
        out.push({ path: path.relative(docsDir, p).replace(/\\+/g,'/'), text: '' });
      }
    }
  };
  try { walk(docsDir); } catch { return []; }
  return out;
}

const STOP = new Set([
  'the','and','for','with','that','this','from','into','your','you','our','are','was','were','but','not','use','using',
  'have','has','had','can','will','able','about','over','more','than','then','also','been','their','they','them',
  'on','in','to','of','a','an','as','by','at','it','its','or','be','is','am','we','us','what','did','does'
]);
const stripFrontMatter = (md) => String(md||'').replace(/^---[\s\S]*?---\s*/, '').trim();
const tokens      = (s) => (String(s).toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(t => !STOP.has(t));
const splitParas  = (t) => stripFrontMatter(t).split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
const titleFor    = (mdPath, text) => (text.match(/title:\s*(.+)/)?.[1]?.trim()) ?? mdPath.replace(/^projects\//,'').replace(/\.md$/,'').replace(/[-_]/g,' ').trim();

export async function GET(req) { return POST(req); } // allow GET for quick testing

export async function POST(req){
  try {
    const body = await req.json().catch(()=> ({}));
    const mode = body.mode || new URL(req.url).searchParams.get('mode') || 'ask';

    const docsDir = resolveDocsDir();
    const corpus  = readAllDocs(docsDir);

    // LIST works even when empty (so UI can show zero state)
    if (mode === 'list') {
      const projects = corpus.filter(d => d.path.startsWith('projects/')).map(d => d.path);
      const others   = corpus.filter(d => !d.path.startsWith('projects/')).map(d => d.path);
      return NextResponse.json({
        ok: true, projects, others,
        _debug: { cwd: process.cwd(), docsDir, docsDirExists: !!docsDir, corpusCount: corpus.length }
      });
    }

    // Friendly error (200) if no docs found
    if (!corpus.length) {
      return NextResponse.json({
        ok:false, error:`No documents found. Expected at: ${docsDir || '<unresolved>'}`, hits:[], note:'', md:''
      });
    }

    if (mode === 'ask') {
      const qTok = tokens(body.q || '');
      if (!qTok.length) return NextResponse.json({ ok:true, hits: [] });

      const hits = [];
      for (const doc of corpus) {
        if (!doc.text) continue;
        for (const p of splitParas(doc.text)) {
          const score = qTok.reduce((s,t)=> s + (p.toLowerCase().includes(t) ? 1 : 0), 0);
          if (score > 0) hits.push({ score, p, source: doc.path });
        }
      }
      if (!hits.length) {
        const scored = corpus.filter(d=>d.text).map(d=>{
          const t=d.text.toLowerCase();
          return { score: qTok.reduce((s,k)=> s + (t.includes(k)?1:0),0), doc:d };
        }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
        for (const {doc} of scored){
          const first = splitParas(doc.text)[0];
          if (first) hits.push({ score:1, p: `${titleFor(doc.path, doc.text)} — ${first}`, source:doc.path });
        }
      }
      hits.sort((a,b)=> b.score - a.score);
      return NextResponse.json({ ok:true, hits: hits.slice(0,8) });
    }

    if (mode === 'cover') {
      const kws = tokens(body.jd || '');
      const freq = new Map(); kws.forEach(t=>freq.set(t,(freq.get(t)||0)+1));
      const top = Array.from(new Set(kws)).sort((a,b)=>(freq.get(b)||0)-(freq.get(a)||0)).slice(0,25);

      const projects = corpus.filter(d => d.path.startsWith('projects/'));
      const scored = projects.map(d => ({ score: top.reduce((s,k)=> s + (d.text.toLowerCase().includes(k)?1:0), 0), doc: d }))
                             .sort((a,b)=> b.score - a.score);
      const picks = scored.slice(0, 2).map(s=>s.doc);
      const projNames = picks.map(p => titleFor(p.path, p.text)).join(', ') || 'HSBC Payments, Mercedes-Benz IA';

      const bio114 = corpus.find(c=> c.path.endsWith('bio/bio_114.md'))?.text || '';
      const bio48  = corpus.find(c=> c.path.endsWith('bio/bio_48.md'))?.text || '';
      const bio    = stripFrontMatter(bio114) || stripFrontMatter(bio48);

      const reqs = top.slice(0,3);
      const bullets = reqs.length
        ? reqs.map(r => `- ${r} → evidence in ${projNames}`).join('\n')
        : `- Enterprise UX → HSBC corporate payments\n- IA & research → Mercedes-Benz IA\n- Prototyping & testing → JEWZY / La Casa Shambala`;

      const note = [
        `Hi — I’m Ed Birchmore, a senior UX consultant/architect with 27+ years across enterprise, finance, media and travel.`,
        `Here’s why I’m a fit:`,
        ``,
        bullets,
        ``,
        `Selected work: ${projNames}`,
        `Availability: contract or perm (flexible)`,
        ``,
        `Short bio: ${(bio || '').slice(0, 260)}…`
      ].join('\n');

      return NextResponse.json({ ok:true, note });
    }

    if (mode === 'case') {
      const project = String(body.project || '');
      const doc = corpus.find(d => d.path === project);
      if (!doc) return NextResponse.json({ ok:false, error:'Not found' });

      const md  = stripFrontMatter(doc.text);
      const lines = md.split('\n');
      const find = (label) => {
        const re = new RegExp(`^(#+\\s*)?(${label})\\b`, 'i');
        let s=-1,e=lines.length; for(let i=0;i<lines.length;i++){ if(re.test(lines[i])){ s=i+1; break; } }
        if (s<0) return '';
        for(let i=s;i<lines.length;i++){ if(/^#+\s/.test(lines[i])){ e=i; break; } }
        return lines.slice(s,e).join('\n').trim();
      };
      const context = find('the\\s+brief');
      const role    = find('my\\s+role');
      const results = find('major\\s+accomplishments|challenges?\\s*&?\\s*results?');

      const caseMd = `# ${project.replace(/^projects\\//,'').replace(/\\.md$/,'').replace(/[-_]/g,' ')}

**Context**  
${context || '—'}

**Goal**  
${(context.split('. ')[0] || '—')}

**Approach**  
${role || '—'}

**Results**  
${results || '—'}

**Your role**  
${role || '—'}
`;
      return NextResponse.json({ ok:true, md: caseMd });
    }

    return NextResponse.json({ ok:false, error:'Unknown mode' });
  } catch (e) {
    // Never return an empty 500; always JSON
    return NextResponse.json({ ok:false, error:String(e) });
  }
}
