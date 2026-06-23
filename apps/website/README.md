# Ganju site

The Ganju marketing + docs + blog site, built with [Astro](https://astro.build)
and deployed as static files to [Cloudflare Pages](https://pages.cloudflare.com).

Static HTML output means great SEO and no Worker at runtime. Interactive bits
reuse `@ganju/ui` (React + MUI) as **islands** that hydrate only where needed;
content pages reuse `@ganju/utils` directly.

## Structure

```
website/
├── astro.config.mjs        static output, @astrojs/react + sitemap
├── wrangler.toml           Cloudflare Pages (pages_build_output_dir = dist)
├── public/                 static assets served at / (icons, images, robots.txt)
└── src/
    ├── content.config.ts   collections: docs, blog
    ├── content/{docs,blog}/*.md   page content (authored as Markdown)
    ├── md/                 Markdown twins for hand-built pages (index, pricing)
    ├── layouts/Base.astro  <head>, SEO, header/footer, shared client script
    ├── components/         Header / Footer / Seo (.astro) + react/ islands
    ├── lib/site.ts         site metadata + nav (single source of truth)
    ├── pages/
    │   ├── index.astro · pricing.astro · privacy.astro · terms.astro
    │   ├── docs/  → index + [...slug].astro (+ [...slug].md.ts)
    │   ├── blog/  → index + [...slug].astro (+ [...slug].md.ts)
    │   ├── *.md.ts          raw Markdown endpoints (index, pricing, docs, blog)
    │   └── llms.txt.ts      AI index of every page's Markdown
    └── styles/global.css   ported from the original static site
```

## Markdown for AI

Every page is available as raw Markdown — append `.md` to the URL
(`/docs/getting-started` → `/docs/getting-started.md`). Docs and blog serve their
source verbatim; hand-built pages have a twin in `src/md/`. `/llms.txt` indexes
them all. Each page's `<head>` also advertises its twin via
`<link rel="alternate" type="text/markdown">`.

## Reusing `@ganju/ui` (islands)

Marketing/prose pages ship **zero JS**. Interactive widgets are React islands
that hydrate client-side — see `src/components/react/`. `Providers.tsx` mirrors
`apps/web/src/theme.ts` so MUI components inherit the same theme; components
render `client:only="react"` so the heavy MUI/Emotion bundle never blocks SEO
content. Example: the "copy your connection URL" block on `/docs`.

## Local dev

```bash
npm run dev          # astro dev server (from this folder)
```

## Build & deploy (Cloudflare Pages)

```bash
npm run build              # → dist/
npm run preview            # build + wrangler pages dev on :5173
npm run landing-deploy     # from repo root: production deploy
```

`deploy-dev` / `deploy-prod` build first, then `wrangler pages deploy dist`.
