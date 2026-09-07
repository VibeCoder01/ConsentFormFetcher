import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import packageInfo from '../../package.json';

const context = new AsyncLocalStorage<{ id: string; operation: string }>();
const operations = new Set(['login', 'machine', 'session', 'logout', 'setup', 'config', 'ad', 'ad-test', 'backup', 'staff', 'email', 'tumour-sites', 'tumour-groups', 'consent-forms', 'upload', 'koms', 'pdf-fields', 'pdf-fill', 'scrape', 'updates', 'update-forms']);
const codes = new Set(['ENOENT', 'EACCES', 'EPERM', 'ENOSPC', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UND_ERR_CONNECT_TIMEOUT']);
let queue = Promise.resolve();
let warned = false;

export function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'UNKNOWN';
  const e = error as { code?: unknown; cause?: unknown; name?: unknown };
  if (typeof e.code === 'string' && codes.has(e.code)) return e.code;
  if (e.cause && e.cause !== error) {
    const cause = e.cause as { code?: unknown };
    if (typeof cause.code === 'string' && codes.has(cause.code)) return cause.code;
  }
  if (e.code === 49) return 'LDAP_INVALID_CREDENTIALS';
  if (e.code === 10) return 'LDAP_REFERRAL';
  if (e.name === 'ZodError') return 'VALIDATION';
  if (e.name === 'TimeoutError' || e.name === 'AbortError') return 'TIMEOUT';
  return 'UNKNOWN';
}

// Deliberately accept only fixed events and numeric metadata. Never serialize errors,
// request bodies, headers, URLs, filenames, field names, or patient/staff objects.
export async function feedback(event: 'started' | 'completed' | 'failed' | 'denied' | 'fields' | 'saved' | 'upstream' | 'source' | 'rendering' | 'writing', details: { status?: number; durationMs?: number; count?: number; bytes?: number; error?: unknown } = {}) {
  if (process.env.FEEDBACK_LOG_ENABLED !== 'true') return;
  const current = context.getStore();
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(), version: packageInfo.version, node: process.version,
    platform: process.platform, correlationId: current?.id ?? randomUUID(),
    operation: current && operations.has(current.operation) ? current.operation : 'internal', event,
  };
  for (const key of ['status', 'durationMs', 'count', 'bytes'] as const) {
    const value = details[key];
    if (typeof value === 'number' && Number.isFinite(value)) entry[key] = value;
  }
  if (details.error) entry.errorCode = errorCode(details.error);
  const line = JSON.stringify(entry) + '\n';
  queue = queue.then(async () => {
    const directory = process.env.FEEDBACK_LOG_DIR || path.join(process.cwd(), 'logs');
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const file = path.join(directory, `feedback-${process.pid}.jsonl`);
    // Expire only files owned by this logger. Never touch document folders.
    for (const name of await fs.readdir(directory)) {
      if (!/^feedback-\d+\.jsonl(?:\.[12])?$/.test(name)) continue;
      const candidate = path.join(directory, name);
      const stat = await fs.stat(candidate).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs > 7 * 86400000) await fs.unlink(candidate).catch(() => {});
    }
    const stat = await fs.stat(file).catch(() => null);
    if (stat && stat.size + Buffer.byteLength(line) > 2 * 1024 * 1024) {
      await fs.rm(`${file}.2`, { force: true });
      await fs.rename(`${file}.1`, `${file}.2`).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; });
      await fs.rename(file, `${file}.1`);
    }
    await fs.appendFile(file, line, { mode: 0o600 });
  }).catch(() => {
    if (!warned) console.error('Feedback log unavailable. Check log directory permissions and disk space.');
    warned = true;
  });
  await queue;
}

export async function trace<T>(operation: string, work: () => Promise<T>): Promise<T> {
  return context.run({ id: randomUUID(), operation }, async () => {
    const start = performance.now();
    await feedback('started');
    try {
      const result = await work();
      await feedback('completed', { durationMs: Math.round(performance.now() - start), ...(result instanceof Response ? { status: result.status } : {}) });
      if (result instanceof Response) result.headers.set('X-Correlation-ID', context.getStore()!.id);
      return result;
    } catch (error) {
      await feedback('failed', { error, durationMs: Math.round(performance.now() - start) });
      throw error;
    }
  });
}
