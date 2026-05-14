import { constants } from './constants';

const SLUG_BYTES = 16;
const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const RESERVED = new Set(constants.RESERVED_SLUGS);

export const generateRandomSlug = (): string => {
  const bytes = new Uint8Array(SLUG_BYTES);
  crypto.getRandomValues(bytes);
  let hex = '';
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, '0');
  }
  return hex;
};

export const isReservedSlug = (slug: string): boolean =>
  RESERVED.has(slug.toLowerCase());

export const isValidSlugFormat = (slug: string): boolean =>
  typeof slug === 'string' &&
  slug.length >= 3 &&
  slug.length <= 63 &&
  SLUG_PATTERN.test(slug);
