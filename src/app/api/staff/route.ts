
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { StaffMember } from '@/lib/types';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const jsonFilePath = path.join(process.cwd(), 'src', 'config', 'staff.json');
    const jsonData = await fs.readFile(jsonFilePath, 'utf-8');
    const data: StaffMember[] = JSON.parse(jsonData);
    return NextResponse.json(data);
  } catch (error) {
    await logActivity("Failed to read staff data", { status: 'FAILURE', details: error });
    return NextResponse.json({ message: "Could not load staff data." }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const updatedStaff: StaffMember[] = await request.json();
        
        // Basic validation to ensure it's an array
        if (!Array.isArray(updatedStaff)) {
            const errorMsg = "Invalid data format. Expected an array of staff members.";
            await logActivity("Update staff data", { status: 'FAILURE', details: errorMsg });
            return NextResponse.json({ message: errorMsg }, { status: 400 });
        }

        const jsonFilePath = path.join(process.cwd(), 'src', 'config', 'staff.json');
        const jsonData = JSON.stringify(updatedStaff, null, 2);
        
        await fs.writeFile(jsonFilePath, jsonData, 'utf-8');
        
        await logActivity("Staff data updated", { status: 'SUCCESS' });
        return NextResponse.json({ message: "Staff data updated successfully." });

    } catch (error) {
        await logActivity("Failed to write staff data", { status: 'FAILURE', details: error });
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not update staff data.", error: message }, { status: 500 });
    }
}
