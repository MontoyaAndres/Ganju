import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ganju.ai',
  integrations: [react(), sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: true }
  },
  vite: {
    ssr: {
      noExternal: [
        '@ganju/ui',
        '@mui/material',
        '@emotion/react',
        '@emotion/styled'
      ]
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/, /packages\/utils\/dist/],
        transformMixedEsModules: true
      }
    },
    optimizeDeps: { include: ['@ganju/utils'] }
  }
});
