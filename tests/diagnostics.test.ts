import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { feedback, trace } from '@/lib/diagnostics';
afterEach(() => vi.unstubAllEnvs());
describe('feedback privacy and retention', () => {
  it('writes only allowed metadata, rotates, and expires old logs', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'feedback-test-'));
    vi.stubEnv('FEEDBACK_LOG_ENABLED', 'true'); vi.stubEnv('FEEDBACK_LOG_DIR', directory);
    try {
      const file = path.join(directory, `feedback-${process.pid}.jsonl`);
      await fs.writeFile(file, 'x'.repeat(2 * 1024 * 1024));
      const old = path.join(directory, 'feedback-999999.jsonl'); await fs.writeFile(old, 'old');
      await fs.utimes(old, new Date(0), new Date(0));
      await fs.writeFile(path.join(directory, 'unrelated.txt'), 'keep');
      await trace('koms', async () => {
        await feedback('failed', { error: new Error('Patient SECRET R1234567 password=SECRET /private/path'), count: 2, ...{ patient: 'SECRET' } });
        await feedback('upstream', { status: 502 });
      });
      const text = await fs.readFile(file, 'utf8');
      expect(text).not.toContain('SECRET'); expect(text).not.toContain('R1234567'); expect(text).not.toContain('/private');
      const rows = text.trim().split('\n').map(line => JSON.parse(line));
      expect(new Set(rows.map(row => row.correlationId)).size).toBe(1);
      expect(rows.every(row => row.operation === 'koms')).toBe(true);
      expect(await fs.readdir(directory)).toContain(`feedback-${process.pid}.jsonl.1`);
      expect(await fs.readdir(directory)).not.toContain('feedback-999999.jsonl');
      expect(await fs.readFile(path.join(directory, 'unrelated.txt'), 'utf8')).toBe('keep');
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
  });
  it('does not create a log when disabled', async () => {
    vi.stubEnv('FEEDBACK_LOG_ENABLED', 'false');
    const spy = vi.spyOn(fs, 'appendFile');
    await feedback('started'); expect(spy).not.toHaveBeenCalled();
  });
});
