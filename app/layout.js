
import './globals.css';
import fs from 'fs';
import path from 'path';

export const metadata = {
  title: 'Ed Birchmore — AI Portfolio Agent',
  description: 'Ask about my work • Tailored cover note • Case study generator',
};

function getConfig() {
  const p = path.join(process.cwd(), 'app', 'site.config.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export default function RootLayout({ children }) {
  const cfg = getConfig();
  return (
    <html lang="en">
      <head>
        <style>{`:root{--accent:${cfg.accent}}`}</style>
      </head>
      <body>
        <header style={{borderBottom:'1px solid #1f2430', position:'sticky', top:0, backdropFilter:'blur(6px)', background:'rgba(11,12,16,.75)', zIndex:10}}>
          <div className="container" style={{padding:'14px 16px'}}>
            <div style={{display:'flex', alignItems:'center', gap:14, flexWrap:'wrap'}}>
              <div style={{width:38, height:38, borderRadius:12, background:'var(--accent)', display:'grid', placeItems:'center', fontWeight:800, color:'#0b0c10'}}>EB</div>
              <div>
                <div style={{fontWeight:700}}> {cfg.name} — AI Portfolio Agent</div>
                <small style={{color:'var(--muted)'}}>{cfg.tagline} · {cfg.availability}</small>
              </div>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
