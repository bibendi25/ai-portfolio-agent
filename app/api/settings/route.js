export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({
    name: "Ed Birchmore",
    tagline: "Senior UX Consultant & Architect",
    availability: "Available: contract or perm • Hybrid/Remote",
    accent: "#7aa2f7",
    hero: "Talk to my work — Ask about my projects, get a tailored cover note, or spin up a case study.",
    footerNote: "All answers cite only the files listed in Sources. No external data is used."
  });
}
