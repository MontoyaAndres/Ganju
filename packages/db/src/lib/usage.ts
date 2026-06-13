import { eq, sql } from 'drizzle-orm';

import * as schema from './schema';
import type { Database } from './db';

// Either a pooled connection or an open transaction — the denormalized usage
// bump runs in both (alongside the channel runner's audit writes, or on its own
// from the MCP flush).
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type DbExecutor = Database | Transaction;

export interface UsageCounts {
  tool?: number;
  prompt?: number;
  resource?: number;
}

// Apply a batch of invocations to an artifact's denormalized usage totals, so
// the overview reads them without aggregating the execution log. No-op when
// every delta is zero, so callers can hand it raw tallies without guarding.
export const incrementArtifactUsage = async (
  executor: DbExecutor,
  artifactId: string,
  counts: UsageCounts
): Promise<void> => {
  const tool = counts.tool ?? 0;
  const prompt = counts.prompt ?? 0;
  const resource = counts.resource ?? 0;
  if (tool === 0 && prompt === 0 && resource === 0) return;

  await executor
    .update(schema.artifact)
    .set({
      artifactToolUsageCount: sql`(${schema.artifact.artifactToolUsageCount}::int + ${tool})::int`,
      artifactPromptUsageCount: sql`(${schema.artifact.artifactPromptUsageCount}::int + ${prompt})::int`,
      artifactResourceUsageCount: sql`(${schema.artifact.artifactResourceUsageCount}::int + ${resource})::int`
    })
    .where(eq(schema.artifact.id, artifactId));
};
