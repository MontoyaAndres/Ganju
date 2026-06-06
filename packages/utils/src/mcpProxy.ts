import { constants } from './constants';

// Remote MCP tool keys are untrusted (the remote chooses them). Only allow the
// charset MCP clients accept for tool names so the composed local name can't
// break registration or downstream API calls.
const REMOTE_TOOL_NAME_RE = /^[a-zA-Z0-9_-]+$/;

// Compose the local MCP tool name for a proxied remote tool (`<prefix><sep><key>`),
// or return null when the remote key can't be safely surfaced — bad charset, or
// the composed name exceeds the tool-name length limit clients enforce. Callers
// skip-and-log nulls rather than registering an unusable tool.
export const buildProxyToolName = (
  prefix: string,
  remoteName: string
): string | null => {
  if (!remoteName || !REMOTE_TOOL_NAME_RE.test(remoteName)) return null;
  const name = `${prefix}${constants.MCP_PROXY_TOOL_NAME_SEP}${remoteName}`;
  if (name.length > constants.MCP_PROXY_TOOL_NAME_MAX) return null;
  return name;
};
