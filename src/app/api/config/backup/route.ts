
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { EmailContact, StaffMember, TumourSite, ADConfig } from '@/lib/types';

// Define paths
const appConfigPath = path.join(process.cwd(), 'src', 'config', 'app.json');
const emailConfigPath = path.join(process.cwd(), 'src', 'config', 'email.json');
const staffConfigPath = path.join(process.cwd(), 'src', 'config', 'staff.json');
const tumourSitesConfigPath = path.join(process.cwd(), 'src', 'config', 'tumour-sites.json');
const adConfigPath = path.join(process.cwd(), 'src', 'config', 'ad.json');


// Define a type for the combined data for type safety
interface BackupData {
    settings: object;
    emails: EmailContact[];
    staff: StaffMember[];
    tumourSites: TumourSite[];
    ad: Omit<ADConfig, 'bindPassword'>;
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
    const [settings, emails, staff, tumourSites, adConfig] = await Promise.all([
        readJsonFile(appConfigPath, {}),
        readJsonFile(emailConfigPath, []),
        readJsonFile(staffConfigPath, []),
        readJsonFile(tumourSitesConfigPath, []),
        readJsonFile<ADConfig>(adConfigPath, { url: '', baseDN: '', bindDN: '', groupDNs: { read: '', change: '', full: '' } }),
    ]);

    // Securely remove the password before sending to the client
    const { bindPassword, ...secureAdConfig } = adConfig;

    const backupData: BackupData = {
        settings,
        emails,
        staff,
        tumourSites,
        ad: secureAdConfig,
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
        const data: Partial<BackupData & { ad: ADConfig }> = await request.json();

        // Basic validation
        if (!data.settings || typeof data.settings !== 'object' || 
            !data.emails || !Array.isArray(data.emails) ||
            !data.staff || !Array.isArray(data.staff) ||
            !data.tumourSites || !Array.isArray(data.tumourSites) ||
            !data.ad || typeof data.ad !== 'object'
        ) {
            return NextResponse.json({ message: "Invalid backup file format. It must contain settings, emails, staff, tumourSites, and ad config." }, { status: 400 });
        }
        
        const settingsJsonData = JSON.stringify(data.settings, null, 2);
        const emailsJsonData = JSON.stringify(data.emails, null, 2);
        const staffJsonData = JSON.stringify(data.staff, null, 2);
        const tumourSitesJsonData = JSON.stringify(data.tumourSites, null, 2);
        
        // Securely handle AD config import
        const currentAdConfig = await readJsonFile<ADConfig>(adConfigPath, { url: '', baseDN: '', bindDN: '', groupDNs: { read: '', change: '', full: '' } });
        const importedAdConfig = data.ad;

        // Preserve existing password if not provided in the import
        if (!importedAdConfig.bindPassword) {
            importedAdConfig.bindPassword = currentAdConfig.bindPassword;
        }
        const adJsonData = JSON.stringify(importedAdConfig, null, 2);


        // Write all files
        await Promise.all([
            fs.writeFile(appConfigPath, settingsJsonData, 'utf-8'),
            fs.writeFile(emailConfigPath, emailsJsonData, 'utf-8'),
            fs.writeFile(staffConfigPath, staffJsonData, 'utf-8'),
            fs.writeFile(tumourSitesConfigPath, tumourSitesJsonData, 'utf-8'),
            fs.writeFile(adConfigPath, adJsonData, 'utf-8'),
        ]);
        
        return NextResponse.json({ message: "Full application configuration imported successfully." });

    } catch (error) {
        console.error("Failed to write config files on import:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not import configuration.", error: message }, { status: 500 });
    }
}
