
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { StaffMember } from '@/lib/types';

export async function GET() {
  try {
    const jsonFilePath = path.join(process.cwd(), 'src', 'config', 'staff.json');
    const jsonData = await fs.readFile(jsonFilePath, 'utf-8');
    const data: StaffMember[] = JSON.parse(jsonData);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to read staff data file:", error);
    return NextResponse.json({ message: "Could not load staff data." }, { status: 500 });
  }
}
