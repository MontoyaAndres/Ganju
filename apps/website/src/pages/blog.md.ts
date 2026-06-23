import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog'))
    .filter(p => !p.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const lines = posts.map(p => {
    const date = p.data.date.toISOString().slice(0, 10);
    return `- [${p.data.title}](https://ganju.ai/blog/${p.id}.md) — ${date} — ${p.data.description}`;
  });
  const body = `# Ganju Blog\n\nUpdates, guides, and stories from the Ganju team.\n\n${lines.join('\n')}\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  });
};
