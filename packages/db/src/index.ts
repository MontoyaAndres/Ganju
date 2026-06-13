import { create, schema, incrementArtifactUsage } from './lib';
import { handleError } from './utils';

export const db = {
  create,
  schema,
  incrementArtifactUsage
};
export const utils = {
  handleError
};

export type { Database, DbExecutor, UsageCounts } from './lib';
