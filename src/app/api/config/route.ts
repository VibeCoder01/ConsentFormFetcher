
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const configPath = path.join(process.cwd(), 'src', 'config', 'app.json');

// Define a type for the config for better type safety
interface AppConfig {
    rcrConsentFormsUrl: string;
    rcrBaseUrl: string;
    validateRNumber: boolean;
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
    console.error("Failed to read app config file:", error);
    return NextResponse.json({ message: "Could not load app configuration." }, { status: 500 });
  }
}

// POST handler to update the configuration
export async function POST(request: Request) {
    try {
        const { rcrConsentFormsUrl } = await request.json();

        if (typeof rcrConsentFormsUrl !== 'string' || !rcrConsentFormsUrl) {
             return NextResponse.json({ message: "Invalid URL provided." }, { status: 400 });
        }

        // Read the full config to avoid overwriting other values
        const currentConfig = await readConfig();
        
        // Update only the specific field
        const updatedConfig: AppConfig = {
            ...currentConfig,
            rcrConsentFormsUrl: rcrConsentFormsUrl,
        };

        const jsonData = JSON.stringify(updatedConfig, null, 2);
        
        await fs.writeFile(configPath, jsonData, 'utf-8');
        
        return NextResponse.json({ message: "Configuration updated successfully.", newConfig: updatedConfig });

    } catch (error) {
        console.error("Failed to write app config file:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not update configuration.", error: message }, { status: 500 });
    }
}
