
import fs from 'fs'; import path from 'path';
const DOCS_DIR = path.join(process.cwd(), 'public', 'docs');
function readAllDocs(){ const files=[]; (function walk(d){ for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(/(\.md|\.mdx)$/i.test(e.name)){ files.push({path:path.relative(DOCS_DIR,p).replace(/\\/g,'/'), text: fs.readFileSync(p,'utf8')}) } else if(/\.pdf$/i.test(e.name)){ files.push({path:path.relative(DOCS_DIR,p).replace(/\\/g,'/'), text:''}) } } })(DOCS_DIR); return files; }
export function getCorpus(){ if(!global.__CORPUS__) global.__CORPUS__ = readAllDocs(); return global.__CORPUS__; }
export function stripFrontMatter(md){ return md.replace(/^---[\s\S]*?---\s*/,'').trim(); }
