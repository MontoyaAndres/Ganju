import { UI } from '@ganju/ui';
import { Providers } from './Providers';

// Selective island: the surrounding page is static HTML; only this interactive
// copy widget hydrates (rendered `client:only="react"`). Reuses @ganju/ui so it
// looks and behaves exactly like the same control inside the product.
export default function ConnectionUrl({ url }: { url: string }) {
  return (
    <Providers>
      <UI.CopyableBlock label="Your connection URL" text={url} meta="MCP endpoint" />
    </Providers>
  );
}
