import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const docs = (await getCollection('docs')).sort(
    (a, b) => a.data.order - b.data.order
  );
  const lines = docs.map(
    d =>
      `- [${d.data.title}](https://ganju.ai/docs/${d.id}.md) — ${d.data.description}`
  );
  const body = `# Ganju Docs\n\nGuides for connecting your AI to your files, tools, and apps.\n\n${lines.join('\n')}\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  });
};
