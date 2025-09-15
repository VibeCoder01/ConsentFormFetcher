
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const configPath = path.join(process.cwd(), 'src', 'config', 'app.json');

// Define a type for the config for better type safety
interface AppConfig {
    rcrConsentFormsUrl: string;
    rcrBaseUrl: string;
    validateRNumber: boolean;
    previewPdfFields: boolean;
    pdfOpenMethod: 'browser' | 'acrobat';
    rtConsentFolder: string;
    prepopulateWithFakeData: boolean;
    showWelshForms: boolean;
    komsApiDebugMode: boolean;
}

// Function to read the current config
async function readConfig(): Promise<AppConfig> {
    const jsonData = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(jsonData);
}

// GET handler to fetch the current configuration
export async function GET() {
  try {
    const config = await readConfig();
    return NextResponse.json(config);
  } catch (error) {
    await logActivity("Failed to read app config", { status: 'FAILURE', details: error });
    return NextResponse.json({ message: "Could not load app configuration." }, { status: 500 });
  }
}

// POST handler to update the configuration
export async function POST(request: Request) {
    try {
        const updates: Partial<AppConfig> = await request.json();

        if (typeof updates.rcrConsentFormsUrl === 'string' && !updates.rcrConsentFormsUrl) {
             const errorMsg = "URL cannot be empty.";
             await logActivity('Update app configuration', { status: 'FAILURE', details: errorMsg });
             return NextResponse.json({ message: errorMsg }, { status: 400 });
        }

        // Read the full config to avoid overwriting other values
        const currentConfig = await readConfig();
        
        // Merge the updates with the current config
        const updatedConfig: AppConfig = {
            ...currentConfig,
            ...updates
        };

        const jsonData = JSON.stringify(updatedConfig, null, 2);
        
        await fs.writeFile(configPath, jsonData, 'utf-8');
        
        await logActivity('App configuration updated', { status: 'SUCCESS', details: updates });
        return NextResponse.json({ message: "Configuration updated successfully.", newConfig: updatedConfig });

    } catch (error) {
        await logActivity('Failed to write app config', { status: 'FAILURE', details: error });
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not update configuration.", error: message }, { status: 500 });
    }
}
