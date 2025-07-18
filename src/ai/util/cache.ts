// A minimal in-memory cache to avoid the `node-cache` dependency which cannot
// be installed in some restricted environments. This mirrors the behaviour of
// the original cache with a fixed TTL of one hour.

import type { ConsentFormCategory } from '@/lib/types';

const ONE_HOUR_MS = 60 * 60 * 1000;

let cachedData: ConsentFormCategory[] | undefined;
let cacheExpiry = 0;

export function getCachedForms(): ConsentFormCategory[] | undefined {
  if (cacheExpiry > Date.now()) {
    return cachedData;
  }
  return undefined;
}

export function updateCache(data: ConsentFormCategory[]): boolean {
  cachedData = data;
  cacheExpiry = Date.now() + ONE_HOUR_MS;
  return true;
}
