import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const child = spawn(process.execPath, ['scripts/sandbox.mjs'], { stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', data => { output += data; });
child.stderr.on('data', () => {}); // Never include launcher output/credentials in reports.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const base = 'http://localhost:9002';
try {
  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (child.exitCode !== null) throw new Error('Sandbox exited before startup.');
    if (output.includes('Password: ')) {
      try { const response = await fetch(`${base}/api/auth/setup-status`, { signal: AbortSignal.timeout(10000) }); if (response.ok) { ready = true; break; } } catch {}
    }
    await delay(1000);
  }
  assert.ok(ready, 'Sandbox did not become ready');
  const token = output.match(/Password: ([a-f0-9]+)/)?.[1];
  const directory = output.match(/Temporary documents and feedback logs: (.+)/)?.[1];
  assert.ok(token && directory);
  assert.equal((await fetch(`${base}/api/config`)).status, 401);
  assert.equal((await fetch(`${base}/api/koms?RNumber=TEST123`)).status, 401);
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ username: 'demo', password: token }) });
  assert.equal(login.status, 200, 'Synthetic login failed');
  const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert.ok(cookie);
  const headers = { Cookie: cookie };
  const session = await fetch(`${base}/api/auth/session`, { headers });
  assert.equal((await session.json()).isLoggedIn, true);
  const config = await fetch(`${base}/api/config`, { headers });
  assert.equal(config.status, 200);
  const settings = await config.json();
  assert.ok(settings.rtConsentFolder.startsWith(directory));
  const patient = await fetch(`${base}/api/koms?RNumber=TEST123`, { headers });
  assert.equal(patient.status, 200);
  assert.equal((await patient.json()).surname, 'Synthetic');
  const denied = await fetch(`${base}/api/config`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Origin: 'https://other.test' }, body: '{}' });
  assert.equal(denied.status, 403);
  const page = await fetch(base, { headers });
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes('Synthetic sandbox'));
  const manifest = JSON.parse(await fs.readFile('.next/server/server-reference-manifest.json', 'utf8'));
  async function action(name, input) {
    const id = Object.entries(manifest.node).find(([, metadata]) => metadata.exportedName === name)?.[0];
    assert.ok(id, `Missing server action ${name}`);
    const response = await fetch(base, { method: 'POST', headers: { ...headers, Origin: base, 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify([input]) });
    assert.equal(response.status, 200, `Server action ${name} failed`);
    assert.ok((await response.text()).includes('"success":true'), `Server action ${name} did not succeed`);
  }
  await action('getPdfFields', 'https://sandbox.invalid/template.pdf');
  for (const identifier of ['TEST123', 'TEST456']) {
    await action('fillPdf', { formUrl: 'https://sandbox.invalid/template.pdf', fields: { 'Patient full name': 'Alice Synthetic', 'Patient unique identifier': identifier }, patientIdentifier: identifier, clinicianName: 'Synthetic Doctor', formTitle: 'Synthetic template' });
  }
  const folder = path.join(settings.rtConsentFolder, 'Synthetic_Doctor', 'TEMP');
  const documents = await fs.readdir(folder);
  assert.equal(documents.length, 2, 'Generation did not preserve both PDFs');
  const identifiers = [];
  for (const name of documents) {
    const pdf = await PDFDocument.load(await fs.readFile(path.join(folder, name)));
    identifiers.push(pdf.getForm().getTextField('Patient unique identifier').getText());
  }
  assert.deepEqual(identifiers.sort(), ['TEST123', 'TEST456']);
  await fetch(`${base}/api/auth/logout`, { method: 'POST', headers });
  const logs = await fs.readdir(path.join(directory, 'logs'));
  const text = (await Promise.all(logs.map(name => fs.readFile(path.join(directory, 'logs', name), 'utf8')))).join('');
  for (const forbidden of [token, 'TEST123', 'TEST456', 'Alice', 'Synthetic', settings.rtConsentFolder]) assert.ok(!text.includes(forbidden), 'Feedback contained a forbidden value');
  const records = text.trim().split('\n').map(line => JSON.parse(line));
  assert.ok(records.some(row => row.operation === 'koms' && row.status === 200));
  console.log('Sandbox HTTP smoke passed: authentication, configuration, synthetic KOMS, origin checks, page rendering, PDF inspection/generation, document preservation, logout and feedback privacy.');
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => { if (child.exitCode !== null) resolve(); else child.once('exit', resolve); });
}
