import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.join(process.cwd(), 'public', 'docs');

function safeReadAllDocs() {
  if (!fs.existsSync(DOCS_DIR)) return [];
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(md|mdx)$/i.test(entry.name)) {
        files.push({ path: path.relative(DOCS_DIR, p).replace(/\\+/g, '/'), text: fs.readFileSync(p, 'utf8') });
      } else if (/\.pdf$/i.test(entry.name)) {
        files.push({ path: path.relative(DOCS_DIR, p).replace(/\\+/g, '/'), text: '' });
      }
    }
  };
  try { walk(DOCS_DIR); } catch { return []; }
  return files;
}

export function getCorpus() {
  try {
    if (!global.__CORPUS__) global.__CORPUS__ = safeReadAllDocs();
    return global.__CORPUS__;
  } catch {
    return [];
  }
}

export function stripFrontMatter(md) {
  return String(md || '').replace(/^---[\s\S]*?---\s*/, '').trim();
}
