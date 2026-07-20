# Fabrice Bellingard — personal site

Static profile showcase at [www.bellingard.fr](https://www.bellingard.fr/), built with [Astro](https://astro.build/) 7 and Tailwind 4.

## Principles

- **Simple** to read and maintain
- **Light** (eco-design): static HTML, self-hosted fonts, minimal JS, no Google services
- **LinkedIn as career source of truth**, enriched by local content files

## Develop

```bash
npm install
npm run dev
```

## LinkedIn import

1. LinkedIn → Settings → Data privacy → **Get a copy of your data**
2. Download the ZIP when ready (typically into `~/Downloads`)
3. Import — with no argument, the script picks the unique `*LinkedIn*.zip` in `~/Downloads`:

```bash
npm run linkedin:import
# or explicitly:
npm run linkedin:import -- ./exports/Complete_LinkedInDataExport.zip
```

Generated JSON lands in `src/data/linkedin/` (committed). Enrich or correct via:

- `src/data/site.json` — narrative, photo, social links
- `src/data/overrides.json` — hide skills/education, override positions, group roles under a company entry (`positionGroups`)
- `src/content/open-source/`, `impact/`, `publications/` — collections

## Build & deploy

```bash
npm run build
npm run preview
```

GitHub Actions (`.github/workflows/deploy.yml`) builds and publishes `dist` to GitHub Pages. Set Pages source to **GitHub Actions** in the repo settings.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local server |
| `npm run build` | Static build |
| `npm run preview` | Preview build |
| `npm run check` | Astro/TS check |
| `npm run linkedin:import` | Import LinkedIn export |
