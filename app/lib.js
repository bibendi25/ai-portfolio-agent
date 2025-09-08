
import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.join(process.cwd(), 'docs');

function readAllDocs() {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/(\.md|\.mdx)$/i.test(entry.name)) {
        files.push({ path: path.relative(DOCS_DIR, p).replace(/\\/g,'/'), text: fs.readFileSync(p, 'utf8') });
      } else if (/\.pdf$/i.test(entry.name)) {
        files.push({ path: path.relative(DOCS_DIR, p).replace(/\\/g,'/'), text: '' });
      }
    }
  }
  walk(DOCS_DIR);
  return files;
}

export function getCorpus() {
  if (!global.__CORPUS__) global.__CORPUS__ = readAllDocs();
  return global.__CORPUS__;
}

export function stripFrontMatter(md) {
  return md.replace(/^---[\s\S]*?---\s*/,'').trim();
}
