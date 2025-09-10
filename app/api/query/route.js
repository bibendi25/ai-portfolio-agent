export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/** ——— Safe local corpus reader ——— */
const DOCS_DIR = path.join(process.cwd(), 'public', 'docs');

function safeReadAllDocs() {
  if (!fs.existsSync(DOCS_DIR)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(md|mdx)$/i.test(entry.name)) {
        out.push({
          path: path.relative(DOCS_DIR, p).replace(/\\+/g, '/'),
          text: fs.readFileSync(p, 'utf8')
        });
      } else if (/\.pdf$/i.test(entry.name)) {
        out.push({ path: path.relative(DOCS_DIR, p).replace(/\\+/g, '/'), text: '' });
      }
    }
  };
  try { walk(DOCS_DIR); } catch { return []; }
  return out;
}
function stripFrontMatter(md) {
  return String(md || '').replace(/^---[\s\S]*?---\s*/, '').trim();
}

/** ——— Tiny retrieval helpers ——— */
const STOP = new Set([
  'the','and','for','with','that','this','from','into','your','you','our','are','was','were','but','not','use','using',
  'have','has','had','can','will','able','about','over','more','than','then','also','been','their','they','them',
  'on','in','to','of','a','an','as','by','at','it','its','or','be','is','am','we','us','what','did','does'
]);
function tokens(str){ return (String(str).toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(t => !STOP.has(t)); }
function splitParas(text){ return stripFrontMatter(text).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean); }
function titleFor(mdPath, text){
  const m = text.match(/title:\s*(.+)/);
  return m ? m[1].trim()
           : mdPath.replace(/^projects\//,'').replace(/\.md$/,'').replace(/[-_]/g,' ').trim();
}

export async function POST(req){
  // Never throw raw; always JSON back
  let body = {};
  try { body = await req.json(); } catch {_/*ignore*/=null;}
  const mode = body.mode || 'ask';

  // Read corpus safely on each call (fast for a small portfolio)
  const corpus = safeReadAllDocs();

  // Mode: list (works even if empty)
  if (mode === 'list') {
    const projects = corpus.filter(d => d.path.startsWith('projects/')).map(d => d.path);
    const others   = corpus.filter(d => !d.path.startsWith('projects/')).map(d => d.path);
    return NextResponse.json({
      ok: true,
      projects,
      others,
      _debug: {
        cwd: process.cwd(),
        docsDir: DOCS_DIR,
        docsDirExists: fs.existsSync(DOCS_DIR),
        corpusCount: corpus.length
      }
    });
  }

  // If no docs, return a friendly JSON error (status 200 so UI doesn’t blow up)
  if (!Array.isArray(corpus) || corpus.length === 0) {
    return NextResponse.json({
      ok: false,
      error: `No documents found under ${DOCS_DIR}. Ensure 'public/docs/*' is in the repo.`,
      hits: [],
      note: '',
      md: ''
    });
  }

  if (mode === 'ask') {
    const qTok = tokens(body.q || '');
    if (!qTok.length) return NextResponse.json({ ok:true, hits: [] });

    const hits = [];
    for (const doc of corpus) {
      if (!doc.text) continue;
      const paras = splitParas(doc.text);
      for (const p of paras) {
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
    const scored = projects.map(d => ({
      score: top.reduce((s,k)=> s + (d.text.toLowerCase().includes(k)?1:0), 0),
      doc: d
    })).sort((a,b)=> b.score - a.score);

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
      `Availability: con
