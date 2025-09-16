
'use server';

import { z } from 'zod';
import ActiveDirectory from 'activedirectory2';
import type { ADConfig } from '@/lib/types';
import * as path from 'path';
import * as fs from 'fs/promises';

// Helper to get config without direct imports in server code
async function getAdConfig(): Promise<ADConfig> {
    const configPath = path.join(process.cwd(), 'src', 'config', 'ad.json');
    const jsonData = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(jsonData);
}

const AdAuthInputSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type AdAuthInput = z.infer<typeof AdAuthInputSchema>;

export interface AdAuthOutput {
  success: boolean;
  message: string;
  user?: any;
}

export async function authenticateAdUser(input: AdAuthInput): Promise<AdAuthOutput> {
  try {
    const adConfig = await getAdConfig();
    const ad = new ActiveDirectory(adConfig);
    
    return new Promise((resolve) => {
        ad.authenticate(input.username, input.password, (err, auth) => {
            if (err) {
                console.error('AD Authentication Error:', err);
                resolve({ success: false, message: `Authentication failed: ${err.message}` });
                return;
            }
            if (auth) {
                ad.findUser(input.username, (err, user) => {
                    if (err) {
                        console.error('AD Find User Error:', err);
                        resolve({ success: false, message: `Could not find user after authentication: ${err.message}` });
                        return;
                    }
                    if (!user) {
                         resolve({ success: false, message: 'User authenticated but could not be found in directory.' });
                         return;
                    }
                    resolve({ success: true, message: 'Authentication successful.', user });
                });
            } else {
                resolve({ success: false, message: 'Authentication failed. Please check your username and password.' });
            }
        });
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred during AD authentication.';
    console.error('AD Flow Error:', message);
    return { success: false, message };
  }
}


export async function testAdConnection(): Promise<{ success: boolean; message: string; }> {
    try {
        const adConfig = await getAdConfig();
        const ad = new ActiveDirectory(adConfig);

        // A simple way to test is to try to find the bind user itself.
        // This verifies credentials, URL, and baseDN are likely correct if it succeeds.
        return new Promise((resolve) => {
            ad.findUser(adConfig.username, (err, user) => {
                if (err) {
                    console.error('AD Connection Test Error:', err);
                    resolve({ success: false, message: `Connection failed: ${err.message}` });
                    return;
                }
                if (!user) {
                    resolve({ success: false, message: 'Connection succeeded, but the bind user could not be found. Check username and baseDN.' });
                    return;
                }
                resolve({ success: true, message: 'Active Directory connection successful.' });
            });
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred during the connection test.';
        console.error('AD Test Flow Error:', message);
        return { success: false, message };
    }
}
