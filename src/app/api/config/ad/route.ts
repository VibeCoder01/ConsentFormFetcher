
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
            // If file doesn't exist, return a default structure
            return {
                url: "",
                baseDN: "",
                username: "",
                password: ""
            };
        }
        throw error;
    }
}

export async function GET() {
  try {
    const config = await readConfig();
    // Do not return the password to the client
    const { password, ...clientConfig } = config;
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
        
        // Merge the updates with the current config
        // If the password is not included in the update, keep the existing one.
        const updatedConfig: ADConfig = {
            url: updates.url ?? currentConfig.url,
            baseDN: updates.baseDN ?? currentConfig.baseDN,
            username: updates.username ?? currentConfig.username,
            password: updates.password || currentConfig.password, // Keep old password if new one is empty
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
