
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { StaffMember } from '@/lib/types';

const appConfigPath = path.join(process.cwd(), 'src', 'config', 'app.json');
const staffConfigPath = path.join(process.cwd(), 'src', 'config', 'staff.json');

// Define types for validation
interface AppConfig {
    rcrConsentFormsUrl: string;
    rcrBaseUrl: string;
    validateRNumber: boolean;
    previewPdfFields: boolean;
    pdfOpenMethod: 'browser' | 'acrobat';
    rtConsentFolder: string;
}

function isAppConfig(data: any): data is AppConfig {
    return (
        typeof data === 'object' &&
        data !== null &&
        typeof data.rcrConsentFormsUrl === 'string' &&
        typeof data.rcrBaseUrl === 'string' &&
        typeof data.validateRNumber === 'boolean' &&
        typeof data.previewPdfFields === 'boolean' &&
        (data.pdfOpenMethod === 'browser' || data.pdfOpenMethod === 'acrobat') &&
        typeof data.rtConsentFolder === 'string'
    );
}

function isValidStaffList(data: any): data is StaffMember[] {
    if (!Array.isArray(data)) return false;
    return data.every(item =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.title === 'string' &&
        typeof item.phone === 'string'
    );
}


// GET handler for exporting all configs
export async function GET() {
  try {
    const appConfigData = await fs.readFile(appConfigPath, 'utf-8');
    const staffData = await fs.readFile(staffConfigPath, 'utf-8');

    const combinedConfig = {
      appConfig: JSON.parse(appConfigData),
      staffList: JSON.parse(staffData),
    };

    return NextResponse.json(combinedConfig);
  } catch (error) {
    console.error("Failed to export all configuration:", error);
    return NextResponse.json({ message: "Could not export configuration." }, { status: 500 });
  }
}

// POST handler for importing all configs
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate the structure of the imported JSON
        if (!body || typeof body !== 'object' || !body.appConfig || !body.staffList) {
            throw new Error("Invalid import format. Expected an object with 'appConfig' and 'staffList' keys.");
        }
        
        const { appConfig, staffList } = body;

        // Validate the content of each part
        if (!isAppConfig(appConfig)) {
             throw new Error("The 'appConfig' data is invalid or missing required fields.");
        }

        if (!isValidStaffList(staffList)) {
            throw new Error("The 'staffList' data is invalid. It must be an array of staff members.");
        }

        // If validation passes, write the files
        const appJsonData = JSON.stringify(appConfig, null, 2);
        const staffJsonData = JSON.stringify(staffList, null, 2);

        await fs.writeFile(appConfigPath, appJsonData, 'utf-8');
        await fs.writeFile(staffConfigPath, staffJsonData, 'utf-8');
        
        return NextResponse.json({ message: "Configuration imported successfully." });

    } catch (error) {
        console.error("Failed to import configuration:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not import configuration.", error: message }, { status: 500 });
    }
}
