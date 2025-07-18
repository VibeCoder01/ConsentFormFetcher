import NodeCache from 'node-cache';
import type { ConsentFormCategory } from '@/lib/types';

// stdTTL: time-to-live in seconds for every new entry. 0 = unlimited.
// checkperiod: The period in seconds, as a number, used for the automatic delete check interval.
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

const CACHE_KEY = 'consentForms';

export function getCachedForms(): ConsentFormCategory[] | undefined {
  return cache.get<ConsentFormCategory[]>(CACHE_KEY);
}

export function updateCache(data: ConsentFormCategory[]): boolean {
  return cache.set(CACHE_KEY, data);
}
