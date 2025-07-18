import NodeCache from 'node-cache';
import type { ConsentFormCategory } from '@/lib/types';

// stdTTL: time-to-live in seconds for every new entry. 0 = unlimited.
const formCache = new NodeCache({ stdTTL: 3600 });

export function getCachedForms(): ConsentFormCategory[] | undefined {
  return formCache.get('consentForms');
}

export function updateCache(data: ConsentFormCategory[]): boolean {
  return formCache.set('consentForms', data);
}
