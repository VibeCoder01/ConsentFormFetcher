
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { TumourGroup } from '@/lib/types';

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
    console.error("Failed to read tumour group config file:", error);
    return NextResponse.json({ message: "Could not load tumour group configuration." }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const updatedGroups: TumourGroup[] = await request.json();
        
        if (!Array.isArray(updatedGroups)) {
            return NextResponse.json({ message: "Invalid data format. Expected an array of tumour groups." }, { status: 400 });
        }

        const jsonData = JSON.stringify(updatedGroups, null, 2);
        
        await fs.writeFile(configPath, jsonData, 'utf-8');
        
        return NextResponse.json({ message: "Tumour group configuration updated successfully." });

    } catch (error) {
        console.error("Failed to write tumour group config file:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not update tumour group configuration.", error: message }, { status: 500 });
    }
}
