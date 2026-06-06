import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '@anju/db';
import { utils } from '@anju/utils';
import {
  discoverOAuthProtectedResourceMetadata,
  discoverAuthorizationServerMetadata,
  refreshAuthorization
} from '@modelcontextprotocol/sdk/client/auth.js';

import { AppEnv } from '../types';

// Runtime counterpart to apps/api's mcpProxyOauth: refreshes an MCP-OAuth
// credential (a token issued by a remote MCP server itself, via dynamic
// registration + PKCE) before the boot loop uses it as a Bearer header. The
// registration + auth-server URL live on metadata.mcpOauth; the token is issued
// by the MCP server, NOT a native provider, so the native refresh path doesn't
// apply.

interface StoredMcpOauth {
  resource: string;
  authorizationServerUrl: string;
  clientId: string;
  clientSecretEnc?: string;
  authMethod?: string;
  pending?: boolean;
}

interface RefreshableCredential {
  id: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string | null;
  metadata?: unknown;
  needsReauth?: boolean;
}

export const readStoredMcpOauth = (
  metadata: unknown
): StoredMcpOauth | null => {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as { mcpOauth?: unknown }).mcpOauth;
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<StoredMcpOauth>;
  if (
    typeof s.resource !== 'string' ||
    typeof s.authorizationServerUrl !== 'string' ||
    typeof s.clientId !== 'string'
  ) {
    return null;
  }
  return s as StoredMcpOauth;
};

const resolveAuthServerMetadata = async (serverUrl: string) => {
  const resourceMeta = await discoverOAuthProtectedResourceMetadata(
    serverUrl
  ).catch(() => undefined);
  const authServerUrl = resourceMeta?.authorization_servers?.[0] ?? serverUrl;
  return discoverAuthorizationServerMetadata(authServerUrl);
};

// Decrypt (and refresh if expiring) an MCP-OAuth credential, returning it in the
// same decrypted shape as refreshCredentialIfNeeded so the boot loop can read
// accessToken/needsReauth uniformly.
export const refreshMcpOauthRuntime = async (
  ctx: Context<AppEnv>,
  credential: RefreshableCredential
): Promise<RefreshableCredential> => {
  const key = utils.getCredentialEncryptionKey(ctx);
  const stored = readStoredMcpOauth(credential.metadata);

  // Still pending (no token yet) → surface as needs-reauth so calls fail clean.
  if (!stored || stored.pending || !credential.accessToken) {
    return {
      ...credential,
      accessToken: credential.accessToken
        ? utils.decryptString(credential.accessToken, key)
        : '',
      refreshToken: null,
      needsReauth: true
    };
  }

  const accessPlain = utils.decryptString(credential.accessToken, key);
  const refreshPlain = credential.refreshToken
    ? utils.decryptString(credential.refreshToken, key)
    : null;

  const expiring =
    !!refreshPlain &&
    !!credential.expiresAt &&
    credential.expiresAt.getTime() -
      utils.constants.CREDENTIAL_REFRESH_BUFFER_MS <=
      Date.now();
  if (!expiring) {
    return {
      ...credential,
      accessToken: accessPlain,
      refreshToken: refreshPlain,
      needsReauth: false
    };
  }

  try {
    const metadata = await resolveAuthServerMetadata(stored.resource);
    const tokens = await refreshAuthorization(stored.authorizationServerUrl, {
      metadata,
      clientInformation: {
        client_id: stored.clientId,
        ...(stored.clientSecretEnc
          ? { client_secret: utils.decryptString(stored.clientSecretEnc, key) }
          : {})
      },
      refreshToken: refreshPlain!,
      resource: new URL(stored.resource)
    });

    const nextRefresh = tokens.refresh_token || refreshPlain;
    const nextExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    const dbInstance = db.create(ctx);
    await dbInstance
      .update(db.schema.artifactCredential)
      .set({
        accessToken: utils.encryptString(tokens.access_token, key),
        refreshToken: nextRefresh
          ? utils.encryptString(nextRefresh, key)
          : null,
        expiresAt: nextExpiresAt,
        scopes: tokens.scope ?? credential.scopes
      })
      .where(eq(db.schema.artifactCredential.id, credential.id));

    return {
      ...credential,
      accessToken: tokens.access_token,
      refreshToken: nextRefresh,
      expiresAt: nextExpiresAt,
      needsReauth: false
    };
  } catch {
    // Transient failure — fall back to the existing token.
    return {
      ...credential,
      accessToken: accessPlain,
      refreshToken: refreshPlain,
      needsReauth: false
    };
  }
};
