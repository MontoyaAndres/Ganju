import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ganju.ai',
  integrations: [
    react(),
    sitemap({
      // Keep the raw Markdown twins (`*.md`) and text endpoints (llms.txt,
      // robots) out of the sitemap — they're for agents, not search indexing.
      filter: page => !/\.(md|txt)(\/)?$/.test(new URL(page).pathname),
      changefreq: 'weekly',
      priority: 0.7,
      serialize: item => {
        if (item.url === 'https://ganju.ai/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        }
        return item;
      }
    })
  ],
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: true }
  },
  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: 'Fustat',
        cssVariable: '--font-fustat',
        weights: [400, 500, 600, 700, 800],
        display: 'swap'
      }
    ]
  }
});
