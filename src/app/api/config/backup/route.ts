
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { EmailContact, StaffMember, TumourSite } from '@/lib/types';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Define paths
const appConfigPath = path.join(process.cwd(), 'src', 'config', 'app.json');
const emailConfigPath = path.join(process.cwd(), 'src', 'config', 'email.json');
const staffConfigPath = path.join(process.cwd(), 'src', 'config', 'staff.json');
const tumourSitesConfigPath = path.join(process.cwd(), 'src', 'config', 'tumour-sites.json');

// Define a type for the combined data for type safety
interface BackupData {
    settings: object;
    emails: EmailContact[];
    staff: StaffMember[];
    tumourSites: TumourSite[];
}

// Helper function to read a JSON file and return a default if it doesn't exist
async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
    try {
        const jsonData = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(jsonData);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return defaultValue;
        }
        throw error;
    }
}


// GET handler to export combined config
export async function GET() {
  try {
    const [settings, emails, staff, tumourSites] = await Promise.all([
        readJsonFile(appConfigPath, {}),
        readJsonFile(emailConfigPath, []),
        readJsonFile(staffConfigPath, []),
        readJsonFile(tumourSitesConfigPath, []),
    ]);

    const backupData: BackupData = {
        settings,
        emails,
        staff,
        tumourSites,
    };
    
    await logActivity('Exported app settings', { status: 'SUCCESS' });
    return NextResponse.json(backupData);
  } catch (error) {
    await logActivity('Failed to export config', { status: 'FAILURE', details: error });
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ message: "Could not export configuration.", error: message }, { status: 500 });
  }
}

// POST handler to import combined config
export async function POST(request: Request) {
    try {
        const data: Partial<BackupData> = await request.json();

        // Basic validation
        if (!data.settings || typeof data.settings !== 'object' || 
            !data.emails || !Array.isArray(data.emails) ||
            !data.staff || !Array.isArray(data.staff) ||
            !data.tumourSites || !Array.isArray(data.tumourSites)
        ) {
            const errorMsg = "Invalid backup file format.";
            await logActivity('Import app settings', { status: 'FAILURE', details: errorMsg });
            return NextResponse.json({ message: "Invalid backup file format. It must contain settings, emails, staff, and tumourSites." }, { status: 400 });
        }
        
        const settingsJsonData = JSON.stringify(data.settings, null, 2);
        const emailsJsonData = JSON.stringify(data.emails, null, 2);
        const staffJsonData = JSON.stringify(data.staff, null, 2);
        const tumourSitesJsonData = JSON.stringify(data.tumourSites, null, 2);

        // Write all files
        await Promise.all([
            fs.writeFile(appConfigPath, settingsJsonData, 'utf-8'),
            fs.writeFile(emailConfigPath, emailsJsonData, 'utf-8'),
            fs.writeFile(staffConfigPath, staffJsonData, 'utf-8'),
            fs.writeFile(tumourSitesConfigPath, tumourSitesJsonData, 'utf-8'),
        ]);
        
        await logActivity('Imported app settings', { status: 'SUCCESS' });
        return NextResponse.json({ message: "Full application configuration imported successfully." });

    } catch (error) {
        await logActivity('Failed to import app settings', { status: 'FAILURE', details: error });
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not import configuration.", error: message }, { status: 500 });
    }
}
