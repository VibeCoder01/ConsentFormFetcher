import { api } from '@/lib/authorization';
import { readAppConfig } from '@/lib/app-config';
import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { feedback } from '@/lib/diagnostics';

export const POST = api('upload', 'read', async request => {
  const limit = 20 * 1024 * 1024;
  // Bound the entire multipart request before parsing; Content-Length is optional.
  if (!request.body) return Response.json({ message: 'No file provided.' }, { status: 400 });
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); return Response.json({ message: 'Upload exceeds 20 MB.' }, { status: 413 }); }
    chunks.push(value);
  }
  const form = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.type !== 'application/pdf') return Response.json({ message: 'A PDF is required.' }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  try { await PDFDocument.load(bytes); } catch { return Response.json({ message: 'Invalid or encrypted PDF.' }, { status: 400 }); }
  const { rtConsentFolder } = await readAppConfig();
  if (!path.isAbsolute(rtConsentFolder)) throw new Error('Invalid output folder.');
  await fs.mkdir(rtConsentFolder, { recursive: true });
  // Ignore the untrusted upload filename and use exclusive creation.
  await fs.writeFile(path.join(rtConsentFolder, `uploaded-${randomUUID()}.PDF`), bytes, { flag: 'wx', mode: 0o600 });
  await feedback('saved', { bytes: bytes.length });
  return Response.json({ success: true, message: 'PDF uploaded successfully.' });
});
