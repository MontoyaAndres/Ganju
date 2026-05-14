// Extracts the artifact slug from the request host. The MCP worker is mounted
// on a wildcard route such as `*.mcp.anju.ai`; the leftmost label identifies
// the artifact (e.g. `7f3a8b2c...mcp.anju.ai` → `7f3a8b2c...`).
//
// Returns null when the request hits the apex (`mcp.anju.ai`) or when the host
// header is malformed — callers should reject the request in that case.
export const resolveArtifactSlug = (req: Request): string | null => {
  const host = req.headers.get('host');
  if (!host) return null;

  const hostname = host.split(':')[0].toLowerCase();
  const labels = hostname.split('.');
  if (labels.length < 3) return null;

  const slug = labels[0];
  if (!slug) return null;

  return slug;
};
