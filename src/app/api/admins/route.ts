
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { AdminUser } from '@/lib/types';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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
    await logActivity('Failed to read admins config file', { status: 'FAILURE', details: error });
    return NextResponse.json({ message: "Could not load admin configuration." }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const updatedAdmins: AdminUser[] = await request.json();
        
        if (!Array.isArray(updatedAdmins)) {
            const errorMsg = "Invalid data format. Expected an array of admin users.";
            await logActivity('Update admin configuration', { status: 'FAILURE', details: errorMsg });
            return NextResponse.json({ message: errorMsg }, { status: 400 });
        }

        const seenUsernames = new Set<string>();
        for (const admin of updatedAdmins) {
            if (!admin.username || admin.username.trim() === '') {
                 const errorMsg = `Admin username cannot be empty.`;
                 await logActivity('Update admin configuration', { status: 'FAILURE', details: errorMsg });
                 return NextResponse.json({ message: errorMsg }, { status: 400 });
            }
            if (seenUsernames.has(admin.username)) {
                 const errorMsg = `Duplicate username found: "${admin.username}"`;
                 await logActivity('Update admin configuration', { status: 'FAILURE', details: errorMsg });
                 return NextResponse.json({ message: errorMsg }, { status: 400 });
            }
            seenUsernames.add(admin.username);
        }

        const jsonData = JSON.stringify(updatedAdmins, null, 2);
        
        await fs.writeFile(adminsConfigPath, jsonData, 'utf-8');
        
        await logActivity('Admin configuration updated', { status: 'SUCCESS' });
        return NextResponse.json({ message: "Admin configuration updated successfully." });

    } catch (error) {
        await logActivity('Failed to write admin config file', { status: 'FAILURE', details: error });
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not update admin configuration.", error: message }, { status: 500 });
    }
}
