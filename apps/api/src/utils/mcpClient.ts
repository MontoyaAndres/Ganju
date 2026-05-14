import { Context } from 'hono';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import type { AppEnv } from '../types';

export const createMcpClient = async (c: Context<AppEnv>, slug: string) => {
  const mcpBaseUrl = process.env.NEXT_PUBLIC_MCP_URL;
  if (!mcpBaseUrl) {
    throw new Error('Missing env: NEXT_PUBLIC_MCP_URL');
  }

  const base = new URL(mcpBaseUrl);
  base.pathname = `/${slug}`;

  const mcpBinding = c.env.MCP;
  const transport = new StreamableHTTPClientTransport(base, {
    fetch: (url, init) =>
      mcpBinding.fetch(url.toString(), init as never) as unknown as Promise<
        Response
      >
  });
  const client = new Client({ name: 'anju-channel', version: '0.0.1' });
  await client.connect(transport);

  return {
    client,
    close: async () => {
      await client.close();
    }
  };
};

export type McpClientHandle = Awaited<ReturnType<typeof createMcpClient>>;
