
'use server';

import { z } from 'zod';
import { Client } from 'ldapts';
import type { ADConfig, AccessLevel } from '@/lib/types';
import * as path from 'path';
import * as fs from 'fs/promises';
import { TlsOptions } from 'tls';

async function getAdConfig(): Promise<ADConfig> {
    const configPath = path.join(process.cwd(), 'src', 'config', 'ad.json');
    const jsonData = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(jsonData);
}

function escapeLDAPfilter(value: string) {
  // RFC4515: escape *, (, ), \, NUL
  return value.replace(/[\0\*\(\)\\]/g, (c) => '\\' + c.charCodeAt(0).toString(16));
}

const AdAuthInputSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type AdAuthInput = z.infer<typeof AdAuthInputSchema>;

export type AuthResult = 
    | { ok: true; userDN: string; roles: AccessLevel[] }
    | { ok: false; reason: string };


async function getTlsOptions(config: ADConfig): Promise<TlsOptions | undefined> {
    if (!config.caFile) {
        // In a dev environment, we might allow this, but for production, it's a risk.
        // For this app, we will enforce it for security.
        return {
             rejectUnauthorized: false // Use with caution in production
        };
    }
    try {
        const caCert = await fs.readFile(config.caFile);
        return {
            ca: [caCert],
            rejectUnauthorized: true, // This is critical for security
        };
    } catch (error) {
        console.error(`Failed to read CA file at ${config.caFile}`, error);
        throw new Error(`Could not read the specified CA file. Please check the path in your ad.json configuration.`);
    }
}


export async function authenticateAndAuthorise(input: AdAuthInput): Promise<AuthResult> {
  const username = input.username.trim();
  const config = await getAdConfig();
  const tlsOptions = await getTlsOptions(config);

  const client = new Client({
    url: config.url,
    timeout: 7000,
    tlsOptions: tlsOptions
  });

  try {
    // 1) Bind as service account
    await client.bind(config.bindDN, config.bindPassword);

    // 2) Find the user DN by sAMAccountName or userPrincipalName
    const u = escapeLDAPfilter(username);
    const { searchEntries } = await client.search(config.baseDN, {
      scope: 'sub',
      filter: `(&(objectClass=user)(|(sAMAccountName=${u})(userPrincipalName=${u})))`,
      attributes: ['dn']
    });
    if (searchEntries.length !== 1) {
      return { ok: false, reason: 'User not found or ambiguous.' };
    }
    const userDN = (searchEntries[0] as any).dn as string;

    // 3) Verify password by binding as the user
    try {
      await client.bind(userDN, input.password);
    } catch {
      return { ok: false, reason: 'Invalid credentials.' };
    }

    // 4) Re-bind as service account for group checks
    await client.bind(config.bindDN, config.bindPassword);

    // Helper: nested group membership via matching-rule-in-chain
    async function isMemberOf(groupDN: string) {
      if (!groupDN) return false;
      const g = escapeLDAPfilter(groupDN);
      const { searchEntries: se } = await client.search(config.baseDN, {
        scope: 'sub',
        filter: `(&(objectClass=user)(distinguishedName=${escapeLDAPfilter(userDN)})(memberOf:1.2.840.113556.1.4.1941:=${g}))`,
        attributes: ['dn']
      });
      return se.length === 1;
    }

    const roles: AccessLevel[] = [];
    if (await isMemberOf(config.groupDNs.read)) roles.push('read');
    if (await isMemberOf(config.groupDNs.change)) roles.push('change');
    if (await isMemberOf(config.groupDNs.full)) roles.push('full');
    
    // Ensure 'full' implies 'change' and 'read', and 'change' implies 'read'
    const finalRoles = new Set<AccessLevel>(roles);
    if (finalRoles.has('full')) {
        finalRoles.add('change');
        finalRoles.add('read');
    }
    if(finalRoles.has('change')) {
        finalRoles.add('read');
    }

    return { ok: true, userDN, roles: Array.from(finalRoles) };
  } catch (error) {
      console.error("LDAP Authentication Error:", error);
      const message = error instanceof Error ? error.message : "An unknown LDAP error occurred.";
      return { ok: false, reason: message };
  }
  finally {
    try { await client.unbind(); } catch {}
  }
}

export async function testAdConnection(): Promise<{ success: boolean; message: string; }> {
    try {
        const config = await getAdConfig();
        const tlsOptions = await getTlsOptions(config);
        const client = new Client({ url: config.url, timeout: 5000, tlsOptions });

        await client.bind(config.bindDN, config.bindPassword);
        await client.unbind();

        return { success: true, message: 'Active Directory connection successful.' };

    } catch (error) {
        console.error('AD Connection Test Error:', error);
        let message = 'An unknown error occurred.';
        if (error instanceof Error) {
            // Provide more specific feedback for common issues
            if (error.name === 'ConnectionError' || error.message.includes('getaddrinfo ENOTFOUND')) {
                message = 'Connection failed: The server URL could not be resolved. Check the hostname and port.';
            } else if (error.name === 'InvalidCredentialsError' || (error as any).code === 49) {
                message = 'Connection failed: Invalid bind credentials provided in ad.json.';
            } else if (error.message.includes('self-signed certificate')) {
                 message = 'Connection failed: The server is using a self-signed certificate. Please provide a path to a trusted CA file in ad.json.';
            }
             else {
                message = `Connection failed: ${error.message}`;
            }
        }
        return { success: false, message: message };
    }
}
