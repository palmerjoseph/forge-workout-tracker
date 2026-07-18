# FORGE

Palmer's personal workout tracker — an installable dark "green glow" PWA
for iPhone and desktop. Free-tier everything (Supabase + Vercel +
Telegram + Resend), zero recurring costs, no AI API calls.

- **Getting it running / one-time setup** → [SETUP.md](SETUP.md)
- **Architecture, decisions, maintenance recipes** → [CLAUDE.md](CLAUDE.md)
- **Visual contract (tokens, icons, charts, motion)** → [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)

```bash
npm install
npm run dev     # runs in localStorage mode until .env exists (see SETUP.md)
npm run build   # type-check + production build + PWA
```
