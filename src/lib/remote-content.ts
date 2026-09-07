import { sandboxEnabled } from './sandbox';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

export function allowedRemoteUrl(value: string): URL {
  const url = new URL(value);
  if (sandboxEnabled() && value === 'https://sandbox.invalid/template.pdf') return url;
  const hosts = (process.env.FORM_ALLOWED_HOSTS || 'www.rcr.ac.uk,rcr.ac.uk').split(',').map(host => host.trim().toLowerCase());
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !hosts.includes(url.hostname)) {
    throw new Error('Form source is not an approved HTTPS host.');
  }
  return url;
}
export function publicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}

export async function remoteContent(value: string, maxBytes = 20 * 1024 * 1024): Promise<Buffer> {
  if (sandboxEnabled() && value === 'https://sandbox.invalid/template.pdf') {
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.create();
    const page = pdf.addPage();
    page.drawText('SYNTHETIC TEST DOCUMENT - NOT FOR CLINICAL USE', { x: 30, y: 800, size: 12 });
    ['Patient full name', 'Patient unique identifier', 'Date of birth', 'Clinician name'].forEach((name, index) => {
      page.drawText(name, { x: 30, y: 740 - index * 80, size: 10 });
      pdf.getForm().createTextField(name).addToPage(page, { x: 30, y: 700 - index * 80, width: 400, height: 30 });
    });
    return Buffer.from(await pdf.save());
  }
  if (sandboxEnabled()) throw new Error('The sandbox serves only its synthetic PDF.');
  const deadline = Date.now() + 20000;
  async function get(value: string, redirects: number): Promise<Buffer> {
    const url = allowedRemoteUrl(value);
    const addresses = await Promise.race([
      lookup(url.hostname, { all: true }),
      new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('Source lookup timed out.')), 5000); timer.unref(); }),
    ]);
    if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw new Error('Source resolved to a prohibited network address.');
    // Pin the checked DNS result for this connection, preventing DNS rebinding.
    return new Promise<Buffer>((resolve, reject) => {
      const request = https.get(url, {
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, addresses);
          else callback(null, addresses[0].address, addresses[0].family);
        },
      }, response => {
        const status = response.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
          response.resume();
          if (redirects >= 3) { reject(new Error('Too many source redirects.')); return; }
          resolve(get(new URL(response.headers.location, url).href, redirects + 1));
          return;
        }
        if (status !== 200) { response.resume(); reject(new Error('Source returned an unsuccessful response.')); return; }
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > maxBytes) { request.destroy(new Error('Source exceeds the size limit.')); return; }
          chunks.push(chunk);
        });
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      });
      const timer = setTimeout(() => request.destroy(new Error('Source request timed out.')), Math.max(1, deadline - Date.now()));
      request.on('close', () => clearTimeout(timer));
      request.on('error', reject);
    });
  }
  return get(value, 0);
}
