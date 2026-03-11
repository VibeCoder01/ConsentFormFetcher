
import { NextResponse } from 'next/server';
import { ADConfig } from '@/lib/types';
import { normaliseAdConfig, readAdConfig, stripAdConfigSecrets, writeAdConfig } from '@/lib/ad-config';

export async function GET() {
  try {
    const config = await readAdConfig();
    return NextResponse.json(stripAdConfigSecrets(config));
  } catch (error) {
    console.error("Failed to read AD config file:", error);
    return NextResponse.json({ message: "Could not load AD configuration." }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const updates: Partial<ADConfig> = await request.json();
        const currentConfig = await readAdConfig();
        
        const updatedConfig = normaliseAdConfig({
            ...currentConfig,
            ...updates,
            bindPassword: updates.bindPassword || currentConfig.bindPassword,
            groupDNs: {
                ...currentConfig.groupDNs,
                ...updates.groupDNs,
            },
        });

        await writeAdConfig(updatedConfig);
        
        return NextResponse.json({ message: "Active Directory configuration updated successfully." });

    } catch (error) {
        console.error("Failed to write AD config file:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not update configuration.", error: message }, { status: 500 });
    }
}
