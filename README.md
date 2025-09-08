# AI Portfolio Agent — Next.js (Tiny Web Demo + Settings)

Three flows (Ask • Cover note • Case study) backed by Markdown in `/docs`.

## Run locally
```bash
npm install
npm run dev
# http://localhost:3000
```

## Tweak content
- Edit Markdown in `/docs` (bios, projects, testimonials, way-of-working). Commit & redeploy.
- Change site look/text in `app/site.config.json`:
```json
{
  "name": "Ed Birchmore",
  "tagline": "Senior UX Consultant & Architect",
  "availability": "Available: contract or perm • London/remote",
  "accent": "#7aa2f7",
  "hero": "Talk to my work — Ask about my projects, get a tailored cover note, or spin up a case study.",
  "footerNote": "All answers cite only the files listed in Sources. No external data is used."
}
```
The accent colour is injected as a CSS variable, so the theme updates instantly on redeploy.

## Deploy to Vercel
- Push this folder to a new GitHub repo → Import to Vercel → defaults.
- Embed in Wix with an iframe:
```html
<iframe src="https://your-agent.vercel.app" style="width:100%; height:900px; border:0" loading="lazy"></iframe>
```
