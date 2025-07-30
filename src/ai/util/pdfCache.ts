import NodeCache from 'node-cache';

// stdTTL: time-to-live in seconds. PDFs will be cached for 10 minutes.
const pdfCache = new NodeCache({ stdTTL: 600 });

export function getCachedPdf(id: string): Uint8Array | undefined {
  return pdfCache.get(id);
}

export function setCachedPdf(id: string, pdfBytes: Uint8Array): boolean {
  return pdfCache.set(id, pdfBytes);
}
