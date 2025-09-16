// src/lib/ad-config-loader.ts
import path from 'path';
import fs from 'fs/promises';
import { ADConfig } from '@/lib/types';

const configPath = path.join(process.cwd(), 'src', 'config', 'ad.json');

// This function is intended to be used by server-side code like middleware.
export async function getAdConfigForSetup(): Promise<ADConfig> {
    try {
        const jsonData = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(jsonData) as ADConfig;
    } catch (error) {
        // If the file doesn't exist or is unreadable, return a default empty config
        // This ensures the app doesn't crash during initial setup.
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return {
                url: "",
                baseDN: "",
                bindDN: "",
                groupDNs: { read: "", change: "", full: "" }
            };
        }
        // For other errors, re-throw to be handled by the caller
        throw error;
    }
}
