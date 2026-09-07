import { adSchema } from '@/lib/config-schemas';
import { feedback } from '@/lib/diagnostics';
import { api } from '@/lib/authorization';

import { NextResponse } from 'next/server';
import { normaliseAdConfig, readAdConfig, stripAdConfigSecrets, writeAdConfig } from '@/lib/ad-config';

async function handleGET() {
  try {
    const config = await readAdConfig();
    return NextResponse.json(stripAdConfigSecrets(config));
  } catch (error) {
    await feedback('failed', { error });
    return NextResponse.json({ message: "Could not load AD configuration." }, { status: 500 });
  }
}

async function handlePOST(request: Request) {
    try {
        const parsed = adSchema.partial().extend({ groupDNs: adSchema.shape.groupDNs.partial().optional() }).safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ message: "Invalid configuration values." }, { status: 400 });
        const updates = parsed.data;
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
        await feedback('failed', { error });
        const message = 'Operation failed. See the feedback log for diagnostic details.';
        return NextResponse.json({ message: "Could not update configuration.", error: message }, { status: 500 });
    }
}

export const GET = api('ad', 'read', handleGET, true);

export const POST = api('ad', 'full', handlePOST, true);
