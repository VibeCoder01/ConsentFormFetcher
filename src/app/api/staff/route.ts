import { staffSchema } from '@/lib/config-schemas';
import { configDirectory } from '@/lib/config-path';
import { feedback } from '@/lib/diagnostics';
import { api } from '@/lib/authorization';

import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { StaffMember } from '@/lib/types';

async function handleGET() {
  try {
    const jsonFilePath = path.join(configDirectory, 'staff.json');
    const jsonData = await fs.readFile(jsonFilePath, 'utf-8');
    const data: StaffMember[] = JSON.parse(jsonData);
    return NextResponse.json(data);
  } catch (error) {
    await feedback('failed', { error });
    return NextResponse.json({ message: "Could not load staff data." }, { status: 500 });
  }
}

async function handlePOST(request: Request) {
    try {
        const parsed = staffSchema.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ message: "Invalid configuration values." }, { status: 400 });
        const updatedStaff = parsed.data;
        
        // Basic validation to ensure it's an array
        if (!Array.isArray(updatedStaff)) {
            return NextResponse.json({ message: "Invalid data format. Expected an array of staff members." }, { status: 400 });
        }

        const jsonFilePath = path.join(configDirectory, 'staff.json');
        const jsonData = JSON.stringify(updatedStaff, null, 2);
        
        await fs.writeFile(jsonFilePath, jsonData, 'utf-8');
        
        return NextResponse.json({ message: "Staff data updated successfully." });

    } catch (error) {
        await feedback('failed', { error });
        const message = 'Operation failed. See the feedback log for diagnostic details.';
        return NextResponse.json({ message: "Could not update staff data.", error: message }, { status: 500 });
    }
}

export const GET = api('staff', 'read', handleGET, true);

export const POST = api('staff', 'change', handlePOST, true);
