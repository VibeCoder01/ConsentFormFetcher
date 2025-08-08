
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { EmailContact } from '@/lib/types';

// Define paths
const appConfigPath = path.join(process.cwd(), 'src', 'config', 'app.json');
const emailConfigPath = path.join(process.cwd(), 'src', 'config', 'email.json');

// Define a type for the combined data for type safety
interface BackupData {
    settings: object;
    emails: EmailContact[];
}

// GET handler to export combined config
export async function GET() {
  try {
    const appJsonData = await fs.readFile(appConfigPath, 'utf-8');
    const emailJsonData = await fs.readFile(emailConfigPath, 'utf-8');

    const backupData: BackupData = {
        settings: JSON.parse(appJsonData),
        emails: JSON.parse(emailJsonData),
    };

    return NextResponse.json(backupData);
  } catch (error) {
    console.error("Failed to read config files for export:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ message: "Could not export configuration.", error: message }, { status: 500 });
  }
}

// POST handler to import combined config
export async function POST(request: Request) {
    try {
        const data: Partial<BackupData> = await request.json();

        // Basic validation
        if (!data.settings || !data.emails || typeof data.settings !== 'object' || !Array.isArray(data.emails)) {
            return NextResponse.json({ message: "Invalid backup file format." }, { status: 400 });
        }
        
        const settingsJsonData = JSON.stringify(data.settings, null, 2);
        const emailsJsonData = JSON.stringify(data.emails, null, 2);

        // Write both files
        await fs.writeFile(appConfigPath, settingsJsonData, 'utf-8');
        await fs.writeFile(emailConfigPath, emailsJsonData, 'utf-8');
        
        return NextResponse.json({ message: "Settings and email configuration imported successfully." });

    } catch (error) {
        console.error("Failed to write config files on import:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not import configuration.", error: message }, { status: 500 });
    }
}
