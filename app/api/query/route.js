export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getCorpus, stripFrontMatter } from '../../lib';

// minimal stopword list to keep results tidy
const STOP = new Set([
  'the','and','for','with','that','this','from','into','your','you','our','are','was','were','but','not','use','using',
  'have','has','had','can','will','able','about','over','more','than','then','also','been','their','they','them',
  'on','in','to','of','a','an','as','by','at','it','its','or','be','is','am','we','us'
]);

function tokens(str) {
  return (str.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(t => !STOP.has(t));
}

function splitParas(text) {
  return stripFrontMatter(text).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
}

function projectTitle(mdPath, text) {
  const m = text.match(/title:\s*(.+)/);
  return m ? m[1].trim() : mdPath.replace(/^projects\//,'').replace(/\.md$/,'').replace(/[-_]/g,' ').replace(/\s+/g,' ').trim();
}

export async function POST(req) {
  try {
    const body = await req.json();
    const mode = body.mode || 'ask';
    const corpus = getCorpus();
    if (!Array.isArray(corpus) || !corpus.length) {
      return NextResponse.json({ ok:false, error: 'No documents found under public/docs' }, { status: 500 });
    }

    if (mode === 'list') {
      const projects = corpus.filter(d => d.path.startsWith('projects/')).map(d => d.path);
      const others   = corpus.filter(d => !d.path.startsWith('projects/')).map(d => d.path);
      return NextResponse.json({ ok:true, projects, others });
    }

    if (mode === 'ask') {
      const q = String(body.q || '');
      const qTokens = tokens(q);
      if (!qTokens.length) {
        return NextResponse.json({ ok:true, hits: [] });
      }

      const hits = [];
      for (const doc of corpus) {
        if (!doc.text) continue; // skip PDFs here
        const paras = splitParas(doc.text);
        for (const p of paras) {
          const score = qTokens.reduce((s, t) => s + (p.toLowerCase().includes(t) ? 1 : 0), 0);
          if (score > 0) hits.push({ score, p, source: doc.path });
        }
      }

      // fallback: if nothing scored, try a looser regex match and return first paragraphs from matching docs
      if (!hits.length) {
        const re = new RegExp(qTokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
        for (const doc of corpus) {
          if (!doc.text) continue;
          if (re.test(doc.text)) {
            const first = splitParas(doc.text)[0];
            if (first) hits.push({ score: 1, p: first, source: doc.path });
          }
        }
      }

      hits.sort((a, b) => b.score - a.score);
      return NextResponse.json({ ok:true, hits: hits.slice(0, 8) });
    }

    if (mode === 'cover') {
      const jd = String(body.jd || '');
      const kws = tokens(jd);
      // rank tokens by frequency, keep meaningful ones only
      const freq = new Map();
      kws.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
      const top = Array.from(new Set(kws))
        .sort((a,b) => (freq.get(b)||0) - (freq.get(a)||0))
        .slice(0, 25);

      const projects = corpus.filter(d => d.path.startsWith('projects/'));
      const scored = projects.map(d => {
        const text = d.text.toLowerCase();
        const score = top.reduce((s,k) => s + (text.includes(k) ? 1 : 0), 0);
        return { score, doc: d };
      }).sort((a,b) => b.score - a.score);

      const picks = scored.slice(0, 2).map(s => s.doc);
      const projNames = picks.map(p => projectTitle(p.path, p.text)).join(', ') || 'HSBC Payments, Mercedes-Benz IA';

      const bio114 = corpus.find(c => c.path.endsWith('bio/bio_114.md'))?.text || '';
      const bio48  = corpus.find(c => c.path.endsWith('bio/bio_48.md'))?.text || '';
      const bio    = stripFrontMatter(bio114) || stripFrontMatter(bio48);

      const reqs = top.slice(0, 3);
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
        `Short bio: ${bio.slice(0, 260)}…`
      ].join('\n');

      return NextResponse.json({ ok:true, note });
    }

    if (mode === 'case') {
      const project = String(body.project || '');
      const doc = corpus.find(d => d.path === project);
      if (!doc) return NextResponse.json({ ok:false, error: 'Not found' }, { status: 404 });

      // Heuristic mapping from your headings to a 6-part case study
      const md = stripFrontMatter(doc.text);
      const sections = {
        brief: /^(#+\s*)?(the\s+brief)\b/i,
        role: /^(#+\s*)?(my\s+role)\b/i,
        accomplishments: /^(#+\s*)?(major\s+accomplishments|challenges?\s*&?\s*results?)\b/i
      };

      function extractSection(re) {
        const lines = md.split('\n');
        let start = -1, end = lines.length;
        for (let i = 0; i < lines.length; i++) {
          if (re.test(lines[i])) { start = i + 1; break; }
        }
        if (start === -1) return '';
        for (let i = start; i < lines.length; i++) {
          if (/^#+\s/.test(lines[i])) { end = i; break; }
        }
        return lines.slice(start, end).join('\n').trim();
      }

      const title = projectTitle(doc.path, doc.text);
      const context = extractSection(sections.brief) || '—';
      const approach = extractSection(sections.role) || '—';
      const results = extractSection(sections.accomplishments) || '—';

      const caseMd = `# ${title}

**Context**  
${context || '—'}

**Goal**  
${(context.split('. ')[0] || '—')}

**Approach**  
${approach || '—'}

**Results**  
${results || '—'}

**Your role**  
${approach || '—'}
`;

      return NextResponse.json({ ok:true, md: caseMd });
    }

    return NextResponse.json({ ok:false, error: 'Unknown mode' }, { status: 400 });

  } catch (e) {
    return NextResponse.json({ ok:false, error: String(e) }, { status: 500 });
  }
}
