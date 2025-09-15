
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { TumourSite } from '@/lib/types';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const configPath = path.join(process.cwd(), 'src', 'config', 'tumour-sites.json');

export async function GET() {
  try {
    const jsonData = await fs.readFile(configPath, 'utf-8');
    const data: TumourSite[] = JSON.parse(jsonData);
    return NextResponse.json(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, return empty array
        return NextResponse.json([]);
    }
    await logActivity("Failed to read tumour site config", { status: 'FAILURE', details: error });
    return NextResponse.json({ message: "Could not load tumour site configuration." }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const updatedSites: TumourSite[] = await request.json();
        
        if (!Array.isArray(updatedSites)) {
            const errorMsg = "Invalid data format. Expected an array of tumour sites.";
            await logActivity("Update tumour site config", { status: 'FAILURE', details: errorMsg });
            return NextResponse.json({ message: errorMsg }, { status: 400 });
        }

        const jsonData = JSON.stringify(updatedSites, null, 2);
        
        await fs.writeFile(configPath, jsonData, 'utf-8');
        
        await logActivity("Tumour site configuration updated", { status: 'SUCCESS' });
        return NextResponse.json({ message: "Tumour site configuration updated successfully." });

    } catch (error) {
        await logActivity("Failed to write tumour site config", { status: 'FAILURE', details: error });
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not update tumour site configuration.", error: message }, { status: 500 });
    }
}
