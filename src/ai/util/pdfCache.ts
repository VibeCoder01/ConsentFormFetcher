import NodeCache from 'node-cache';

// stdTTL: time-to-live in seconds. PDFs will be cached for 10 minutes.
const pdfCache = new NodeCache({ stdTTL: 600 });

export function getCachedPdf(id: string): Uint8Array | undefined {
  const cached = pdfCache.get(id);
  if (cached) {
    // Make a copy to avoid issues with buffer reuse
    return new Uint8Array(cached as Uint8Array);
  }
  return undefined;
}

export function setCachedPdf(id: string, pdfBytes: Uint8Array): boolean {
  return pdfCache.set(id, pdfBytes);
}
