# WISSPAR

Website for the **Worldwide Index of Serotype Specific Pneumococcal Antibody
Responses (WISSPAR)** — a curated immunogenicity database for pneumococcal
vaccine clinical trials.

This is a [Quarto](https://quarto.org) static website. The interactive
"Graphical View" is a React + Plotly.js app that replaces the original R Shiny
tool ([DanWeinberger/PCV_antibodies](https://github.com/DanWeinberger/PCV_antibodies)).

## Structure

```
_quarto.yml          Site config (navbar, footer, theme)
index.qmd            Home
about.qmd            About / attribution
graphical-view.qmd   Mounts the React interactive tool
trials.qmd           Client-side searchable trials table
resources.qmd        Videos + blog links
theme.scss           Brand theme (colors, fonts)
custom.css           Page-specific tweaks
assets/images/       Mascot + institutional logos
data/                wisspar_export.json (build-time data snapshot)
scripts/fetch-data.mjs   Fetches the export endpoint -> transformed JSON
app/                 Vite + React + TypeScript interactive tool
  -> builds to assets/app/{wisspar.js,wisspar.css}
```

## Develop

```bash
# 1. Refresh the data snapshot (writes data/wisspar_export.json)
node scripts/fetch-data.mjs

# 2. Work on the interactive tool with hot reload
cd app && npm install && npm run dev      # http://localhost:5173

# 3. Preview the full Quarto site (build the tool first)
cd app && npm run build && cd ..
quarto preview
```

## Data

`data/wisspar_export.json` is produced from the wisspar.com export endpoint by
`scripts/fetch-data.mjs`, which applies the same transforms as the original
Shiny app (Wyeth→Pfizer, Merck grouping, `PCV13`→`PCV13 (Pfizer)`, `IgG`→`GMC`,
etc.). The **Refresh data** GitHub Action re-fetches it daily and commits changes;
the browser loads the committed JSON same-origin (avoiding CORS).

## Deploy

Pushing to `main` runs `.github/workflows/publish.yml`, which builds the React
tool, renders the Quarto site, and deploys `_site/` to **GitHub Pages**.

- Enable Pages with **Source: GitHub Actions** in the repo settings.
- The site serves under `/<repo>/` by default. To map the `wisspar.com` custom
  domain, add a `CNAME` file (and configure DNS) — all in-site links are relative,
  so they work under either base path.

## Not rebuilt here

The auth/database-backed features of the original Flask site — trial lookup
(`/view`), dynamic data export (`/export`), and sign-in — are linked out to
`wisspar.com` from the navbar, since a static site cannot replicate them.
