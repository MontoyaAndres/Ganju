import { constants } from './constants';

export interface UsageTally {
  tool: number;
  prompt: number;
  resource: number;
}

// Count a batch of invocations by usage kind. Shared by the channel runner and
// the MCP flush so both feed the artifact's denormalized usage totals the same
// way (anything that isn't tool/prompt/resource — protocol noise — is ignored).
export const tallyUsageKinds = (items: { kind: string }[]): UsageTally => {
  const tally: UsageTally = { tool: 0, prompt: 0, resource: 0 };
  for (const { kind } of items) {
    if (kind === constants.USAGE_KIND_TOOL) tally.tool += 1;
    else if (kind === constants.USAGE_KIND_PROMPT) tally.prompt += 1;
    else if (kind === constants.USAGE_KIND_RESOURCE) tally.resource += 1;
  }
  return tally;
};
