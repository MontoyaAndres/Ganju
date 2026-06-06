// Literal-host SSRF screening shared by the proxied tool dispatchers
// (http-endpoint, mcp-proxy). The Workers runtime can't resolve DNS, so we can
// only screen literal hosts and IPs (not DNS rebinding). Private/loopback/
// link-local ranges are always rejected; callers may further narrow with an
// allowlist.
export const ipv4InPrivateRange = (host: string): boolean => {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map(p => Number(p));
  if (octets.some(o => !Number.isInteger(o) || o < 0 || o > 255)) return false;
  const [a, b] = octets;
  if (a === 127 || a === 10 || a === 0) return true; // loopback / private / "this host"
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata)
  if (a === 192 && b === 168) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  return false;
};

export const isBlockedHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '::1' || host === '::') return true;
  // IPv6 link-local (fe80::/10) and unique-local (fc00::/7).
  if (
    host.startsWith('fe80:') ||
    host.startsWith('fc') ||
    host.startsWith('fd')
  ) {
    return true;
  }
  if (ipv4InPrivateRange(host)) return true;
  return false;
};
