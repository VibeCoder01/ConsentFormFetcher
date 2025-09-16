
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { ADConfig } from '@/lib/types';

const configPath = path.join(process.cwd(), 'src', 'config', 'ad.json');

async function readConfig(): Promise<ADConfig> {
    try {
        const jsonData = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(jsonData);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return {
                url: "",
                baseDN: "",
                bindDN: "",
                bindPassword: "",
                caFile: "",
                groupDNs: {
                    read: "",
                    change: "",
                    full: "",
                }
            };
        }
        throw error;
    }
}

export async function GET() {
  try {
    const config = await readConfig();
    const { bindPassword, ...clientConfig } = config;
    return NextResponse.json(clientConfig);
  } catch (error) {
    console.error("Failed to read AD config file:", error);
    return NextResponse.json({ message: "Could not load AD configuration." }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const updates: Partial<ADConfig> = await request.json();
        const currentConfig = await readConfig();
        
        const updatedConfig: ADConfig = {
            url: updates.url ?? currentConfig.url,
            baseDN: updates.baseDN ?? currentConfig.baseDN,
            bindDN: updates.bindDN ?? currentConfig.bindDN,
            bindPassword: updates.bindPassword || currentConfig.bindPassword,
            caFile: updates.caFile ?? currentConfig.caFile,
            groupDNs: {
                read: updates.groupDNs?.read ?? currentConfig.groupDNs.read,
                change: updates.groupDNs?.change ?? currentConfig.groupDNs.change,
                full: updates.groupDNs?.full ?? currentConfig.groupDNs.full,
            }
        };

        const jsonData = JSON.stringify(updatedConfig, null, 2);
        await fs.writeFile(configPath, jsonData, 'utf-8');
        
        return NextResponse.json({ message: "Active Directory configuration updated successfully." });

    } catch (error) {
        console.error("Failed to write AD config file:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not update configuration.", error: message }, { status: 500 });
    }
}
