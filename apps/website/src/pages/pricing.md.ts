import type { APIRoute } from 'astro';
import raw from '../md/pricing.md?raw';

export const GET: APIRoute = () =>
  new Response(raw, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
  });
