export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getCorpus, stripFrontMatter } from '../../lib';
import fs from 'fs';
import path from 'path';

// … keep the rest of the file the same …

if (mode === 'list') {
  const corpus = getCorpus();
  const projects = corpus.filter(d => d.path.startsWith('projects/')).map(d => d.path);
  const others   = corpus.filter(d => !d.path.startsWith('projects/')).map(d => d.path);

  const docsDir = path.join(process.cwd(), 'public', 'docs');
  const exists  = fs.existsSync(docsDir);
  let sample = [];
  try {
    // show up to 10 immediate children so we know what's actually on disk in prod
    sample = fs.readdirSync(docsDir).slice(0,10);
  } catch (e) {
    sample = ['<readdirSync failed: ' + String(e) + '>'];
  }

  return NextResponse.json({
    ok: true,
    projects,
    others,
    _debug: {
      cwd: process.cwd(),
      docsDir,
      docsDirExists: exists,
      corpusCount: corpus.length,
      docsDirSample: sample
    }
  });
}
