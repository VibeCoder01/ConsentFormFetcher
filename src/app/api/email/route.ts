
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { EmailContact } from '@/lib/types';

const emailConfigPath = path.join(process.cwd(), 'src', 'config', 'email.json');

export async function GET() {
  try {
    const jsonData = await fs.readFile(emailConfigPath, 'utf-8');
    const data: EmailContact[] = JSON.parse(jsonData);
    return NextResponse.json(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, return empty array
        return NextResponse.json([]);
    }
    console.error("Failed to read email config file:", error);
    return NextResponse.json({ message: "Could not load email configuration." }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const updatedEmails: EmailContact[] = await request.json();
        
        if (!Array.isArray(updatedEmails)) {
            return NextResponse.json({ message: "Invalid data format. Expected an array of email contacts." }, { status: 400 });
        }

        const jsonData = JSON.stringify(updatedEmails, null, 2);
        
        await fs.writeFile(emailConfigPath, jsonData, 'utf-8');
        
        return NextResponse.json({ message: "Email configuration updated successfully." });

    } catch (error) {
        console.error("Failed to write email config file:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not update email configuration.", error: message }, { status: 500 });
    }
}
