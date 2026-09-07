import { appSchema } from '@/lib/config-schemas';
import { feedback } from '@/lib/diagnostics';
import { api } from '@/lib/authorization';

import { NextResponse } from 'next/server';
import { readAppConfig, updateAppConfig } from '@/lib/app-config';

// GET handler to fetch the current configuration
async function handleGET() {
  try {
    const config = await readAppConfig();
    return NextResponse.json(config);
  } catch (error) {
    await feedback('failed', { error });
    return NextResponse.json({ message: "Could not load app configuration." }, { status: 500 });
  }
}

// POST handler to update the configuration
async function handlePOST(request: Request) {
    try {
        const parsed = appSchema.partial().safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ message: "Invalid configuration values." }, { status: 400 });
        const updates = parsed.data;

        if (typeof updates.rcrConsentFormsUrl === 'string' && !updates.rcrConsentFormsUrl) {
             return NextResponse.json({ message: "URL cannot be empty." }, { status: 400 });
        }

        // Read the full config to avoid overwriting other values
        const updatedConfig = await updateAppConfig(updates);
        
        return NextResponse.json({ message: "Configuration updated successfully.", newConfig: updatedConfig });

    } catch (error) {
        await feedback('failed', { error });
        const message = 'Operation failed. See the feedback log for diagnostic details.';
        return NextResponse.json({ message: "Could not update configuration.", error: message }, { status: 500 });
    }
}

export const GET = api('config', 'read', handleGET, true);

export const POST = api('config', 'change', handlePOST, true);
