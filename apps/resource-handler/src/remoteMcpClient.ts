import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { utils } from '@anju/utils';

// Connect to a remote (third-party) MCP server from inside the container. This
// mirrors apps/mcp's worker-side client, but runs here so large resource bytes
// never transit the 128 MiB worker — the container reads, decodes, and forwards
// the file itself. The host is SSRF-screened (literal hosts only — defense in
// depth even though the URL comes from the curated catalog) and the auth header
// is applied via the transport's fetch so the secret never lands in logs.

export interface RemoteMcpAuthHeader {
  name: string;
  value: string;
}

export interface ConnectRemoteMcpInput {
  url: string;
  transport: string;
  authHeader?: RemoteMcpAuthHeader | null;
  timeoutMs: number;
}

export interface RemoteMcpHandle {
  client: Client;
  close: () => Promise<void>;
}

export const connectRemoteMcpClient = async (
  input: ConnectRemoteMcpInput
): Promise<RemoteMcpHandle> => {
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    throw new Error('Remote MCP server URL is invalid.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Remote MCP server URL must be http or https.');
  }
  if (utils.isBlockedHost(parsed.hostname)) {
    throw new Error(
      `Remote MCP host "${parsed.hostname}" is not allowed (private or loopback address).`
    );
  }

  const fetchWithAuth: typeof fetch = (url, init) => {
    const headers = new Headers(init?.headers);
    if (input.authHeader) {
      headers.set(input.authHeader.name, input.authHeader.value);
    }
    return fetch(url, { ...(init ?? {}), headers });
  };

  const transport =
    input.transport === utils.constants.MCP_PROXY_TRANSPORT_SSE
      ? new SSEClientTransport(parsed, {
          eventSourceInit: { fetch: fetchWithAuth },
          requestInit: input.authHeader
            ? { headers: { [input.authHeader.name]: input.authHeader.value } }
            : undefined
        })
      : new StreamableHTTPClientTransport(parsed, { fetch: fetchWithAuth });

  const client = new Client({
    name: 'anju-resource-handler-mcp-proxy',
    version: '0.0.1'
  });

  const timer = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error('Remote MCP server connection timed out.')),
      input.timeoutMs
    );
  });
  await Promise.race([client.connect(transport), timer]);

  return {
    client,
    close: async () => {
      try {
        await client.close();
      } catch {
        // best-effort; the request is ending anyway
      }
    }
  };
};
