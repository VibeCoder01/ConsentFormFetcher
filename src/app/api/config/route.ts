
import { NextResponse } from 'next/server';
import { AppConfig, readAppConfig, updateAppConfig } from '@/lib/app-config';

// GET handler to fetch the current configuration
export async function GET() {
  try {
    const config = await readAppConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to read app config file:", error);
    return NextResponse.json({ message: "Could not load app configuration." }, { status: 500 });
  }
}

// POST handler to update the configuration
export async function POST(request: Request) {
    try {
        const updates: Partial<AppConfig> = await request.json();

        if (typeof updates.rcrConsentFormsUrl === 'string' && !updates.rcrConsentFormsUrl) {
             return NextResponse.json({ message: "URL cannot be empty." }, { status: 400 });
        }

        // Read the full config to avoid overwriting other values
        const updatedConfig = await updateAppConfig(updates);
        
        return NextResponse.json({ message: "Configuration updated successfully.", newConfig: updatedConfig });

    } catch (error) {
        console.error("Failed to write app config file:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not update configuration.", error: message }, { status: 500 });
    }
}
