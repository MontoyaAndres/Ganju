let cached: string | null | undefined;

const fmt = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);

export async function getStarCount(): Promise<string | null> {
  if (cached !== undefined) return cached;
  try {
    const res = await fetch(
      'https://api.github.com/repos/MontoyaAndres/ganju',
      {
        headers: { 'User-Agent': 'ganju-website' }
      }
    );
    const data = res.ok ? await res.json() : null;
    const n = data?.stargazers_count;
    cached = typeof n === 'number' ? fmt(n) : null;
  } catch {
    cached = null;
  }
  return cached;
}
