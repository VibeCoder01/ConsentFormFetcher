
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { ADConfig } from '@/lib/types';

const configPath = path.join(process.cwd(), 'src', 'config', 'ad.json');

// Default config structure to use if the file doesn't exist
const defaultConfig: ADConfig = {
    url: "",
    baseDN: "",
    bindDN: "",
    groupDNs: {
        read: "",
        change: "",
        full: "",
    }
};

const defaultFullGroupDN = "CN=AppAdmins-Full,OU=Groups,DC=domain,DC=com";

async function readConfig(): Promise<ADConfig> {
    try {
        const jsonData = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(jsonData);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            // If file doesn't exist, we are definitely in setup mode.
            return defaultConfig;
        }
        // If there's another error (e.g., malformed JSON), log it and treat as setup mode for safety.
        console.error("Error reading ad.json:", error);
        return defaultConfig;
    }
}

export async function GET() {
  try {
    const adConfig = await readConfig();
    const isInSetupMode = !adConfig.groupDNs?.full || adConfig.groupDNs.full === defaultFullGroupDN;
    return NextResponse.json({ isInSetupMode });
  } catch (error) {
    // This catch block is for unexpected errors during the process.
    console.error("Error in /api/auth/setup-status:", error);
    // Default to setup mode being true in case of failure to be safe.
    return NextResponse.json({ isInSetupMode: true }, { status: 500 });
  }
}
