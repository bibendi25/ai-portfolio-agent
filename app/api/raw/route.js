export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function resolveDocsDir() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'public', 'docs'),
    path.join(cwd, '..', 'public', 'docs'),
    path.join(cwd, '..', '..', 'public', 'docs')
  ];
  for (const d of candidates) {
    try { if (fs.existsSync(d)) return d; } catch {}
  }
  return null;
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const p = url.searchParams.get('p') || '';
    const docsDir = resolveDocsDir();
    if (!docsDir) return new NextResponse('Docs dir not found', { status: 404 });

    const full = path.normalize(path.join(docsDir, p));
    if (!full.startsWith(docsDir)) return new NextResponse('Bad path', { status: 400 });

    const isPdf = /\.pdf$/i.test(full);
    const data = fs.readFileSync(full);
    return new NextResponse(data, {
      status: 200,
      headers: { 'Content-Type': isPdf ? 'application/pdf' : 'text/markdown; charset=utf-8' }
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}

