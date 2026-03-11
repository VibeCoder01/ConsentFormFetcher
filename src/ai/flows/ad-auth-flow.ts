
'use server';

import { z } from 'zod';
import { Client } from 'ldapts';
import type { ADConfig, AccessLevel } from '@/lib/types';
import * as fs from 'fs/promises';
import { TlsOptions } from 'tls';
import { normaliseCaFile, readAdConfig } from '@/lib/ad-config';

function escapeLDAPfilter(value: string) {
  // RFC4515: escape *, (, ), \, NUL
  return value.replace(/[\0\*\(\)\\]/g, (c) => '\\' + c.charCodeAt(0).toString(16));
}

function buildComputerSearchFilters(hostname: string) {
  const trimmed = hostname.trim().toLowerCase();
  const shortName = trimmed.split('.')[0] ?? trimmed;
  const variants = Array.from(new Set([
    trimmed,
    shortName,
    `${shortName}$`,
  ])).filter(Boolean);

  return variants.map(escapeLDAPfilter);
}

export type AdAuthInput = z.infer<typeof AdAuthInputSchema>;
const AdAuthInputSchema = z.object({
  username: z.string(),
  password: z.string(),
  hostname: z.string().optional(),
});


export type AuthResult = 
    | { ok: true; userDN: string; username: string; roles: AccessLevel[] }
    | { ok: false; reason: string };

const machineAccessDeniedMessage = 'This machine is not authorised to use this application.';

async function getTlsOptions(config: ADConfig): Promise<TlsOptions | undefined> {
    const caFile = normaliseCaFile(config.caFile);

    if (!caFile) {
        // If no CA file is specified, or the path is empty, proceed with caution.
        // This is not recommended for production environments.
        return {
             rejectUnauthorized: false
        };
    }
    try {
        const caCert = await fs.readFile(caFile);
        return {
            ca: [caCert],
            rejectUnauthorized: true, // This is critical for security
        };
    } catch (error) {
        console.error(`Failed to read CA file at ${caFile}`, error);
        throw new Error(`Could not read the specified CA file. Please check the path in your ad.json configuration.`);
    }
}

async function isMemberOf(client: Client, principalDN: string, groupDN: string) {
  if (!groupDN || !principalDN) return false;
  const principal = escapeLDAPfilter(principalDN);
  const { searchEntries } = await client.search(groupDN, {
    scope: 'base',
    filter: `(member:1.2.840.113556.1.4.1941:=${principal})`,
    attributes: ['dn'],
  });
  if (searchEntries.length === 1) {
    return true;
  }

  // Fallback for direct memberships if the matching-rule-in-chain query does not
  // return a result in this AD environment.
  const { searchEntries: principalEntries } = await client.search(principalDN, {
    scope: 'base',
    filter: '(objectClass=*)',
    attributes: ['memberOf'],
  });

  const memberOf = (principalEntries[0] as any)?.memberOf;
  const directGroups = Array.isArray(memberOf)
    ? memberOf
    : memberOf
      ? [memberOf]
      : [];

  return directGroups.some((directGroup) => String(directGroup).trim().toLowerCase() === groupDN.trim().toLowerCase());
}

async function validateMachineAuthorisation(client: Client, config: ADConfig, hostname?: string) {
  if (!config.mfaMachineGroup) {
    return { ok: true as const };
  }

  if (!hostname) {
    return { ok: false as const, reason: machineAccessDeniedMessage };
  }

  const hostnameVariants = buildComputerSearchFilters(hostname);
  const hostnameFilter = hostnameVariants.length === 1
    ? `(dNSHostName=${hostnameVariants[0]})`
    : `(|${hostnameVariants.map((value) => `(dNSHostName=${value})(cn=${value})(name=${value})(sAMAccountName=${value})`).join('')})`;

  const { searchEntries } = await client.search(config.baseDN, {
    scope: 'sub',
    filter: `(&(objectClass=computer)${hostnameFilter})`,
    attributes: ['dn'],
  });

  const computerDns = Array.from(new Set(
    searchEntries
      .map((entry) => (entry as any).dn as string | undefined)
      .filter((dn): dn is string => Boolean(dn))
  ));

  if (computerDns.length === 0) {
    return { ok: false as const, reason: machineAccessDeniedMessage };
  }

  const membershipChecks = await Promise.all(
    computerDns.map((computerDN) => isMemberOf(client, computerDN, config.mfaMachineGroup))
  );
  const isAuthorised = membershipChecks.some(Boolean);

  return isAuthorised
    ? { ok: true as const }
    : { ok: false as const, reason: machineAccessDeniedMessage };
}

export async function checkMachineAuthorisation(hostname?: string): Promise<{ ok: boolean; reason?: string }> {
  const config = await readAdConfig();
  if (!config.mfaMachineGroup) {
    return { ok: true };
  }

  const tlsOptions = await getTlsOptions(config);
  const client = new Client({
    url: config.url,
    timeout: 7000,
    tlsOptions,
  });

  try {
    await client.bind(config.bindDN, config.bindPassword);
    return await validateMachineAuthorisation(client, config, hostname);
  } catch (error) {
    console.error('Machine authorisation error:', error);
    return { ok: false, reason: machineAccessDeniedMessage };
  } finally {
    try { await client.unbind(); } catch {}
  }
}


export async function authenticateAndAuthorise(input: AdAuthInput): Promise<AuthResult> {
  const username = input.username.trim();
  const config = await readAdConfig();
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

    // 5) MFA Check: If a machine group is configured, verify device membership
    const machineCheck = await validateMachineAuthorisation(client, config, input.hostname);
    if (!machineCheck.ok) {
        return { ok: false, reason: machineCheck.reason };
    }
    
    // 6) Role-Based Access Control Check
    const { user, change, full } = config.groupDNs;

    // Check for initial setup: if no groups are defined, grant full access
    if (!user && !change && !full) {
      return { ok: true, userDN, username, roles: ['full', 'change', 'read'] };
    }

    const [isFull, isChange, isUser] = await Promise.all([
      full ? isMemberOf(client, userDN, full) : Promise.resolve(false),
      change ? isMemberOf(client, userDN, change) : Promise.resolve(false),
      user ? isMemberOf(client, userDN, user) : Promise.resolve(false),
    ]);

    if (process.env.NODE_ENV !== 'production') {
      console.log('AD authorisation check', {
        username,
        userDN,
        groups: { user, change, full },
        matches: { isUser, isChange, isFull },
      });
    }

    // The base User group is mandatory for all access. Admin groups should be
    // nested under it in AD so elevated users inherit baseline access.
    if (user && !isUser) {
        return { ok: false, reason: 'Access denied. You must be a member of the User Access Group.' };
    }

    const finalRoles = new Set<AccessLevel>();
    
    if (isFull) {
        finalRoles.add('full');
    }
    if (isChange) {
        finalRoles.add('change');
    }
    if (isUser) {
        finalRoles.add('read');
    }
    
    // Enforce role hierarchy: Full > Change > Read
    if (finalRoles.has('full')) {
        finalRoles.add('change');
        finalRoles.add('read');
    }
    if(finalRoles.has('change')) {
        finalRoles.add('read');
    }

    if(finalRoles.size === 0) {
        // Authenticated user but not a member of any required groups.
        return { ok: true, userDN, username, roles: [] };
    }

    return { ok: true, userDN, username, roles: Array.from(finalRoles) };
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
        const config = await readAdConfig();
        const tlsOptions = await getTlsOptions(config);
        const client = new Client({ url: config.url, timeout: 5000, tlsOptions });

        await client.bind(config.bindDN, config.bindPassword);
        await client.search(config.baseDN, {
            scope: 'base',
            filter: '(objectClass=*)',
            attributes: ['dn'],
        });
        await client.unbind();

        let message = 'Active Directory connection successful.';
        if(tlsOptions?.rejectUnauthorized === false) {
            message += ' Warning: Connection is insecure as certificate validation is disabled.';
        }

        return { success: true, message: message };

    } catch (error) {
        console.error('AD Connection Test Error:', error);
        let message = 'An unknown error occurred.';
        if (error instanceof Error) {
            // Provide more specific feedback for common issues
            if (error.name === 'ConnectionError' || error.message.includes('getaddrinfo ENOTFOUND')) {
                message = 'Connection failed: The server URL could not be resolved. Check the hostname and port.';
            } else if (error.name === 'InvalidCredentialsError' || (error as any).code === 49) {
                message = 'Connection failed: Invalid bind credentials provided in ad.json.';
            } else if ((error as any).code === 10 || error.message.includes('RefErr')) {
                message = 'Connection failed: The Base DN appears invalid or too broad. Use a plain distinguished name such as DC=example,DC=local, without a leading "DN:".';
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
