import { Context } from 'hono';
import { utils } from '@ganju/utils';

import type { AppEnv } from '../../types';

// OAuth 2.0 Protected Resource Metadata (RFC 9728). MCP clients fetch this
// after receiving a 401 with a `WWW-Authenticate` header, to learn which
// authorization server issues tokens for this MCP server.
const protectedResourceMetadata = (c: Context<AppEnv>) => {
  const apiUrl = c.env.NEXT_PUBLIC_API_URL;
  const url = new URL(c.req.url);
  const slug = c.req.param('slug');
  const resource = slug ? `${url.origin}/${slug}` : `${url.origin}/`;

  // Only the OIDC scopes are advertised — they're the ones better-auth's
  // authorize endpoint actually accepts. `mcp:read` and `artifact:<slug>` are
  // deliberately omitted: they aren't in the OIDC allowlist, so a client that
  // requested them off this list would be rejected with `invalid_scope`.
  return c.json({
    resource,
    authorization_servers: apiUrl ? [apiUrl] : [],
    bearer_methods_supported: ['header'],
    scopes_supported: utils.constants.OAUTH_SCOPES_SUPPORTED
  });
};

export const WellKnownController = {
  protectedResourceMetadata
};
