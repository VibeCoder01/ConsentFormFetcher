import path from 'path';
import fs from 'fs/promises';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import type { ADConfig } from '@/lib/types';

const configPath = path.join(process.cwd(), 'src', 'config', 'ad.json');
const placeholderCaFilePaths = new Set([
  '/path/to/your/ca.pem',
  'C:\\path\\to\\your\\ca.pem',
]);
const adConfigKeySalt = 'consentformfetcher-ad-config';

type StoredADConfig = Omit<ADConfig, 'bindPassword'> & {
  bindPassword?: string;
  encryptedBindPassword?: string;
};

export const defaultAdConfig: ADConfig = {
  url: '',
  baseDN: '',
  bindDN: '',
  bindPassword: '',
  caFile: '',
  groupDNs: {
    user: '',
    change: '',
    full: '',
  },
  mfaMachineGroup: '',
};

export function normaliseDn(value?: string): string {
  return (value ?? '')
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/^dn:\s*/i, '');
}

export function normaliseCaFile(caFile?: string): string {
  const value = caFile?.trim() ?? '';
  return placeholderCaFilePaths.has(value) ? '' : value;
}

export function normaliseAdConfig(config: ADConfig): ADConfig {
  return {
    ...defaultAdConfig,
    ...config,
    url: config.url?.trim() ?? '',
    baseDN: normaliseDn(config.baseDN),
    bindDN: normaliseDn(config.bindDN),
    bindPassword: config.bindPassword ?? '',
    caFile: normaliseCaFile(config.caFile),
    groupDNs: {
      user: normaliseDn(config.groupDNs?.user),
      change: normaliseDn(config.groupDNs?.change),
      full: normaliseDn(config.groupDNs?.full),
    },
    mfaMachineGroup: normaliseDn(config.mfaMachineGroup),
  };
}

function getEncryptionSecret(): string {
  const secret = process.env.AD_CONFIG_ENCRYPTION_KEY || process.env.SECRET_COOKIE_PASSWORD;
  if (!secret) {
    throw new Error('AD config encryption secret is not set. Configure AD_CONFIG_ENCRYPTION_KEY or SECRET_COOKIE_PASSWORD.');
  }
  return secret;
}

function getEncryptionKey(): Buffer {
  return scryptSync(getEncryptionSecret(), adConfigKeySalt, 32);
}

function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(value: string): string {
  const parts = value.split(':');
  if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
    return value;
  }

  const [, , ivBase64, tagBase64, encryptedBase64] = parts;
  const key = getEncryptionKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivBase64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function parseStoredConfig(stored: StoredADConfig): ADConfig {
  const bindPassword = stored.encryptedBindPassword
    ? decryptSecret(stored.encryptedBindPassword)
    : (stored.bindPassword ?? '');

  return normaliseAdConfig({
    ...defaultAdConfig,
    ...stored,
    bindPassword,
  });
}

function serialiseConfig(config: ADConfig): StoredADConfig {
  const normalised = normaliseAdConfig(config);
  const { bindPassword, ...rest } = normalised;
  return {
    ...rest,
    encryptedBindPassword: bindPassword ? encryptSecret(bindPassword) : '',
  };
}

export async function readAdConfig(): Promise<ADConfig> {
  try {
    const jsonData = await fs.readFile(configPath, 'utf-8');
    return parseStoredConfig(JSON.parse(jsonData) as StoredADConfig);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...defaultAdConfig };
    }
    throw error;
  }
}

export async function writeAdConfig(config: ADConfig): Promise<void> {
  const jsonData = JSON.stringify(serialiseConfig(config), null, 2);
  await fs.writeFile(configPath, jsonData, 'utf-8');
}

export function stripAdConfigSecrets(config: ADConfig): Omit<ADConfig, 'bindPassword'> {
  const clientConfig = normaliseAdConfig(config);
  delete clientConfig.bindPassword;
  return clientConfig;
}
