import { and, eq } from 'drizzle-orm';
import { db } from '@ganju/db';
import { utils } from '@ganju/utils';
import type { EnvSource } from '@ganju/utils';

import type { Bindings } from '../types';

type ApiEnvSource = EnvSource & { env: Bindings };

const PROVIDER = utils.constants.API_KEY_PROVIDER_CALCOM;

export interface CalcomEventType {
  id: number;
  title: string;
  slug: string | null;
  lengthInMinutes: number | null;
}

// Cheap liveness/auth check used before persisting a user-supplied key — a
// valid key returns 200 (even with zero event types); a bad key returns 401/403.
export const validateCalcomApiKey = async (
  apiKey: string
): Promise<boolean> => {
  let response: Response;
  try {
    response = await fetch(`${utils.constants.CALCOM_API_BASE}/event-types`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'cal-api-version': utils.constants.CALCOM_API_VERSION_EVENT_TYPES,
        Accept: 'application/json'
      }
    });
  } catch {
    return false;
  }
  return response.ok;
};

export const getCalcomApiKey = async (
  source: ApiEnvSource,
  artifactId: string
): Promise<string> => {
  const dbInstance = db.create(source);
  const [credential] = await dbInstance
    .select({
      accessToken: db.schema.artifactCredential.accessToken
    })
    .from(db.schema.artifactCredential)
    .where(
      and(
        eq(db.schema.artifactCredential.artifactId, artifactId),
        eq(db.schema.artifactCredential.provider, PROVIDER)
      )
    )
    .limit(1);

  if (!credential) {
    throw new Error(`calcom credential not found for artifact ${artifactId}`);
  }

  const encryptionKey = utils.getCredentialEncryptionKey(source as never);
  return utils.decryptString(credential.accessToken, encryptionKey);
};

export const listCalcomEventTypes = async (
  apiKey: string
): Promise<CalcomEventType[]> => {
  const response = await fetch(
    `${utils.constants.CALCOM_API_BASE}/event-types`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'cal-api-version': utils.constants.CALCOM_API_VERSION_EVENT_TYPES,
        Accept: 'application/json'
      }
    }
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `calcom event-types failed (${response.status}): ${detail}`
    );
  }

  const payload = (await response.json()) as {
    status?: string;
    data?: Array<{
      id?: number;
      title?: string;
      slug?: string;
      lengthInMinutes?: number;
      length?: number;
    }>;
  };

  const out: CalcomEventType[] = [];
  for (const item of payload.data || []) {
    if (typeof item.id !== 'number') continue;
    out.push({
      id: item.id,
      title: item.title || `Event type ${item.id}`,
      slug: item.slug || null,
      lengthInMinutes: item.lengthInMinutes ?? item.length ?? null
    });
  }
  return out;
};
