import { readResourceContent } from './readResourceContent';
import { refreshCredentialIfNeeded } from './refreshCredential';
import { generateEmbedding } from './embedding';
import { resolveArtifactSlug } from './resolveArtifactSlug';
import { interpolate, type InterpolationMode } from './interpolate';
import { allowProxyToolCall } from './rateLimit';
import {
  connectRemoteMcpClient,
  type RemoteMcpAuthHeader,
  type RemoteMcpHandle
} from './remoteMcpClient';
import {
  parseJsonRpcMessages,
  collectBodyOnlyRequests,
  parseClient,
  resolveExternalSessionId,
  upsertSession,
  flushRequests,
  type PendingRequest
} from './recordUsage';

export {
  readResourceContent,
  refreshCredentialIfNeeded,
  generateEmbedding,
  resolveArtifactSlug,
  interpolate,
  allowProxyToolCall,
  connectRemoteMcpClient,
  parseJsonRpcMessages,
  collectBodyOnlyRequests,
  parseClient,
  resolveExternalSessionId,
  upsertSession,
  flushRequests
};

export type {
  PendingRequest,
  InterpolationMode,
  RemoteMcpAuthHeader,
  RemoteMcpHandle
};
