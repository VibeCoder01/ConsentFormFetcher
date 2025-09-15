
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { TumourGroup } from '@/lib/types';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const configPath = path.join(process.cwd(), 'src', 'config', 'tumour-groups.json');

export async function GET() {
  try {
    const jsonData = await fs.readFile(configPath, 'utf-8');
    const data: TumourGroup[] = JSON.parse(jsonData);
    return NextResponse.json(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, return empty array
        return NextResponse.json([]);
    }
    await logActivity("Failed to read tumour group config", { status: 'FAILURE', details: error });
    return NextResponse.json({ message: "Could not load tumour group configuration." }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const updatedGroups: TumourGroup[] = await request.json();
        
        if (!Array.isArray(updatedGroups)) {
            const errorMsg = "Invalid data format. Expected an array of tumour groups.";
            await logActivity("Update tumour group config", { status: 'FAILURE', details: errorMsg });
            return NextResponse.json({ message: errorMsg }, { status: 400 });
        }

        const jsonData = JSON.stringify(updatedGroups, null, 2);
        
        await fs.writeFile(configPath, jsonData, 'utf-8');
        
        await logActivity("Tumour group configuration updated", { status: 'SUCCESS' });
        return NextResponse.json({ message: "Tumour group configuration updated successfully." });

    } catch (error) {
        await logActivity("Failed to write tumour group config", { status: 'FAILURE', details: error });
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not update tumour group configuration.", error: message }, { status: 500 });
    }
}
