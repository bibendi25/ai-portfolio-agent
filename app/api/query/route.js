
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getCorpus, stripFrontMatter } from '../../lib';
export async function POST(req){
  try{
    const body = await req.json();
    const corpus = getCorpus();
    const mode = body.mode || 'ask';
    if(mode==='list'){
      const projects = corpus.filter(d=>d.path.startsWith('projects/')).map(d=>d.path);
      const others = corpus.filter(d=>!d.path.startsWith('projects/')).map(d=>d.path);
      return NextResponse.json({ok:true, projects, others});
    }
    if(mode==='ask'){
      const q = (body.q||'').toLowerCase();
      const terms = Array.from(new Set(q.match(/[a-z0-9]{3,}/g)||[]));
      const hits=[];
      for(const doc of corpus){ if(!doc.text) continue;
        const paras = stripFrontMatter(doc.text).split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
        for(const p of paras){ const score = terms.reduce((s,t)=> s+(p.toLowerCase().includes(t)?1:0),0); if(score>0) hits.push({score,p,source:doc.path}); }
      }
      hits.sort((a,b)=>b.score-a.score);
      return NextResponse.json({ok:true, hits:hits.slice(0,8)});
    }
    if(mode==='cover'){
      const jd=(body.jd||'').toLowerCase(); const tokens=(jd.match(/[a-z]{3,}/g)||[]);
      const freq=new Map(); tokens.forEach(t=>freq.set(t,(freq.get(t)||0)+1));
      const top=Array.from(new Set(tokens)).sort((a,b)=>(freq.get(b)||0)-(freq.get(a)||0)).slice(0,30);
      const projects=corpus.filter(d=>d.path.startsWith('projects/'));
      const scored=projects.map(d=>({score:top.reduce((s,k)=>s+(d.text.toLowerCase().includes(k)?1:0),0),doc:d})).sort((a,b)=>b.score-a.score);
      const picks=scored.slice(0,2).map(s=>s.doc);
      const projNames=picks.map(p=>(p.text.match(/title:\s*(.+)/)?.[1]||p.path.replace('projects/','').replace(/[-_]/g,' ').replace(/\.md$/,''))).join(', ');
      const bio114=corpus.find(c=>c.path.endsWith('bio/bio_114.md'))?.text||'';
      const bio48=corpus.find(c=>c.path.endsWith('bio/bio_48.md'))?.text||'';
      const bio=stripFrontMatter(bio114)||stripFrontMatter(bio48);
      const reqs=top.slice(0,3); const bullets=reqs.map(r=>`- ${r} → evidence in ${projNames}`).join('\n');
      const note=`Hi — I’m Ed Birchmore, a senior UX consultant/architect with 27+ years across enterprise, finance, media and travel.
Here’s why I’m a fit:

${bullets}

Selected work: ${projNames}
Available: contract or perm (flexible)

Short bio: ${bio.slice(0,300)}`;
      return NextResponse.json({ok:true, note});
    }
    if(mode==='case'){
      const project=body.project; const doc=getCorpus().find(d=>d.path===project);
      if(!doc) return NextResponse.json({ok:false,error:'Not found'},{status:404});
      const bodyMd=stripFrontMatter(doc.text);
      return NextResponse.json({ok:true, md: bodyMd});
    }
    return NextResponse.json({ok:false,error:'Unknown mode'},{status:400});
  }catch(e){ return NextResponse.json({ok:false,error:String(e)},{status:500}); }
}
