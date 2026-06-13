import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '@anju/db';
import { utils } from '@anju/utils';

import { loadProxiedPrompts } from './proxiedPrompts';

import type { AppEnv } from '../../types';

// A slash command parsed off an inbound message, platform-agnostic: `name` is
// the command without its leading slash (lowercased), `trailingText` is
// whatever followed it. Telegram derives this from message entities; Slack from
// either a native slash-command POST or a leading `/word` in message text.
export interface ParsedSlashCommand {
  name: string;
  trailingText: string;
}

// Map a slash command to a prompt the channel agent can invoke. Tries artifact
// prompts first (by slugified title), then proxied (mcp-proxy) prompts by their
// MCP name. The first argument of the prompt's schema receives the trailing
// text, matching the convention used across channels. Returns null when nothing
// matches, so callers can fall back to treating the text as a plain message.
export const resolveSlashPrompt = async (
  c: Context<AppEnv>,
  artifactId: string,
  command: ParsedSlashCommand
): Promise<{
  // The name the runner passes to getPrompt (artifact_prompt id, or a proxied
  // MCP prompt name `<prefix>__<remote>`).
  promptId: string;
  // The artifact_prompt FK to record on usage — null for proxied prompts.
  artifactPromptId: string | null;
  // Human-readable prompt title, recorded as the usage/execution name (promptId
  // is an opaque id for native prompts, so it can't double as the label).
  promptTitle: string;
  args: Record<string, string>;
} | null> => {
  const dbInstance = db.create(c);
  const prompts = await dbInstance
    .select()
    .from(db.schema.artifactPrompt)
    .where(eq(db.schema.artifactPrompt.artifactId, artifactId));

  const match = prompts.find(
    p => utils.slugifyTitle(p.title) === command.name
  );
  if (match) {
    const schema = match.schema as {
      properties?: Record<string, { type: string }>;
    } | null;
    const args: Record<string, string> = {};
    const firstProp = schema?.properties
      ? Object.keys(schema.properties)[0]
      : null;
    if (firstProp && command.trailingText) {
      args[firstProp] = command.trailingText;
    }
    return {
      // The MCP server registers native prompts under their slugified title, so
      // invoke getPrompt by that name (matches command.name), not the id.
      promptId: utils.slugifyTitle(match.title),
      artifactPromptId: match.id,
      promptTitle: match.title,
      args
    };
  }

  // Fall back to proxied (mcp-proxy) prompts, invoked by their MCP name.
  const proxied = await loadProxiedPrompts(dbInstance, artifactId);
  const proxiedMatch = proxied.find(
    p => utils.slugifyTitle(p.title) === command.name
  );
  if (proxiedMatch) {
    const args: Record<string, string> = {};
    const firstArg = proxiedMatch.argumentNames[0];
    if (firstArg && command.trailingText) {
      args[firstArg] = command.trailingText;
    }
    return {
      promptId: proxiedMatch.mcpName,
      artifactPromptId: null,
      promptTitle: proxiedMatch.title,
      args
    };
  }

  return null;
};
