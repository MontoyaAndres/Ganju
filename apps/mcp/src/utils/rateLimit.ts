import type { Bindings } from '../types';

// Per-`artifact_tool` loop guard for proxied tool calls (http-endpoint and
// mcp-proxy), backed by the Cloudflare native rate-limiting binding (configured
// 60 req / 60s in wrangler.toml). Keyed by the artifact_tool id so each
// configured endpoint / proxied server gets its own budget — the goal is to
// stop the model from hammering one backend in a tight loop, not to limit the
// artifact as a whole.
//
// Returns true (allow) when the binding is absent (local dev, mcp-inspector)
// or errors, so a limiter hiccup never blocks a legitimate call.
export const allowProxyToolCall = async (
  env: Bindings,
  artifactToolId: string
): Promise<boolean> => {
  const limiter = env.HTTP_ENDPOINT_RATE_LIMITER;
  if (!limiter) return true;
  try {
    const { success } = await limiter.limit({ key: artifactToolId });
    return success;
  } catch {
    return true;
  }
};
