import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'consent-sandbox-'));
const config = path.join(directory, 'config');
await fs.mkdir(config);
for (const name of ['app', 'ad', 'email', 'staff']) {
  await fs.copyFile(`src/config/${name}.example.json`, path.join(config, `${name}.json`));
}
for (const name of ['tumour-sites', 'tumour-groups']) await fs.copyFile(`src/config/${name}.json`, path.join(config, `${name}.json`));
await fs.writeFile(path.join(config, 'staff.json'), JSON.stringify([{ id: 'synthetic-doctor', name: 'Synthetic Doctor', title: 'Consultant', phone: '', emailRecipients: '' }]));
const app = JSON.parse(await fs.readFile(path.join(config, 'app.json'), 'utf8'));
await fs.writeFile(path.join(config, 'app.json'), JSON.stringify({ ...app, rtConsentFolder: path.join(directory, 'documents'), previewPdfFields: true, prepopulateWithFakeData: false }));
await fs.writeFile(path.join(config, 'consent-forms.json'), JSON.stringify([{ category: 'Synthetic examples', forms: [{ title: 'Synthetic test consent', url: 'https://sandbox.invalid/template.pdf' }] }]));
const token = randomBytes(32).toString('hex');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', '9002'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development', SANDBOX_MODE: 'true', CONFIG_DIR: config, KOMS_URL: '', SECRET_COOKIE_PASSWORD: randomBytes(32).toString('hex'), SETUP_TOKEN: token, AD_CONFIG_ENCRYPTION_KEY: randomBytes(32).toString('hex'), FEEDBACK_LOG_ENABLED: 'true', FEEDBACK_LOG_DIR: path.join(directory, 'logs'), APP_ORIGIN: 'http://localhost:9002', NEXT_TELEMETRY_DISABLED: '1' },
});
console.log(`Synthetic sandbox: http://localhost:9002\nUsername: demo\nPassword: ${token}\nTemporary documents and feedback logs: ${directory}\nEnter any test patient number and use Get Demographics. Never use real patient data.\nFiles are retained after exit for inspection; remove the temporary directory when finished.`);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code || 0; });
