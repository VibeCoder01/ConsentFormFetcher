import { it, expect } from 'vitest';
import { stripAdConfigSecrets, defaultAdConfig } from '@/lib/ad-config';
import { appSchema, staffSchema } from '@/lib/config-schemas';
it('removes both plaintext and persisted ciphertext from client AD configuration', () => {
  const result = stripAdConfigSecrets({ ...defaultAdConfig, bindPassword: 'plaintext', ...{ encryptedBindPassword: 'ciphertext' } });
  expect(JSON.stringify(result)).not.toContain('plaintext');
  expect(JSON.stringify(result)).not.toContain('ciphertext');
});
it('rejects malformed setting types and unknown settings', () => {
  expect(appSchema.partial().safeParse({ previewPdfFields: 'false' }).success).toBe(false);
  expect(appSchema.partial().safeParse({ unexpected: 'value' }).success).toBe(false);
});
it('rejects duplicate staff IDs', () => {
  const row = { id: 'synthetic', name: 'Synthetic', title: 'Consultant', phone: '', emailRecipients: '' };
  expect(staffSchema.safeParse([row, row]).success).toBe(false);
});

import { vi, afterEach } from 'vitest';
import { sandboxEnabled } from '@/lib/sandbox';
afterEach(() => vi.unstubAllEnvs());
it('cannot enable synthetic integrations in production', () => {
  vi.stubEnv('SANDBOX_MODE', 'true');
  vi.stubEnv('NODE_ENV', 'production');
  expect(sandboxEnabled()).toBe(false);
});
