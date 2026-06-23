import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../lib/site';

export const GET: APIRoute = async () => {
  const docs = (await getCollection('docs')).sort(
    (a, b) => a.data.order - b.data.order
  );
  const posts = (await getCollection('blog'))
    .filter(p => !p.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const link = (path: string, title: string, note: string) =>
    `- [${title}](${SITE.url}${path}): ${note}`;

  const body = `# ${SITE.name}

> ${SITE.description}

Every page is available as Markdown by appending \`.md\` to its URL.

## Core

${link('/index.md', 'Overview', 'What Ganju is and what it does')}
${link('/pricing.md', 'Pricing', 'Plans, limits, and self-hosting')}
${link('/docs.md', 'Docs index', 'All documentation guides')}
${link('/blog.md', 'Blog index', 'All posts')}

## Docs

${docs.map(d => link(`/docs/${d.id}.md`, d.data.title, d.data.description)).join('\n')}

## Blog

${posts.map(p => link(`/blog/${p.id}.md`, p.data.title, p.data.description)).join('\n')}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
};
