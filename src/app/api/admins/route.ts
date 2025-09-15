
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { AdminUser } from '@/lib/types';

const adminsConfigPath = path.join(process.cwd(), 'src', 'config', 'admins.json');

export async function GET() {
  try {
    const jsonData = await fs.readFile(adminsConfigPath, 'utf-8');
    const data: AdminUser[] = JSON.parse(jsonData);
    return NextResponse.json(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json([]);
    }
    console.error("Failed to read admins config file:", error);
    return NextResponse.json({ message: "Could not load admin configuration." }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const updatedAdmins: AdminUser[] = await request.json();
        
        if (!Array.isArray(updatedAdmins)) {
            return NextResponse.json({ message: "Invalid data format. Expected an array of admin users." }, { status: 400 });
        }

        const seenUsernames = new Set<string>();
        for (const admin of updatedAdmins) {
            if (!admin.username || admin.username.trim() === '') {
                 return NextResponse.json({ message: `Admin username cannot be empty.` }, { status: 400 });
            }
            if (seenUsernames.has(admin.username)) {
                 return NextResponse.json({ message: `Duplicate username found: "${admin.username}"` }, { status: 400 });
            }
            seenUsernames.add(admin.username);
        }

        const jsonData = JSON.stringify(updatedAdmins, null, 2);
        
        await fs.writeFile(adminsConfigPath, jsonData, 'utf-8');
        
        return NextResponse.json({ message: "Admin configuration updated successfully." });

    } catch (error) {
        console.error("Failed to write admin config file:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not update admin configuration.", error: message }, { status: 500 });
    }
}
