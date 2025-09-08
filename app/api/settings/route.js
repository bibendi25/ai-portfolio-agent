
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const p = path.join(process.cwd(), 'app', 'site.config.json');
  const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
  return NextResponse.json(cfg);
}
