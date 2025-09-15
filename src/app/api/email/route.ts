
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { EmailContact } from '@/lib/types';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const emailConfigPath = path.join(process.cwd(), 'src', 'config', 'email.json');

// Basic email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    await logActivity("Failed to read email config", { status: 'FAILURE', details: error });
    return NextResponse.json({ message: "Could not load email configuration." }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const updatedEmails: EmailContact[] = await request.json();
        
        if (!Array.isArray(updatedEmails)) {
            const errorMsg = "Invalid data format. Expected an array of email contacts.";
            await logActivity('Update email configuration', { status: 'FAILURE', details: errorMsg });
            return NextResponse.json({ message: errorMsg }, { status: 400 });
        }

        const seenEmails = new Set<string>();
        for (const contact of updatedEmails) {
            if (!contact.email || !emailRegex.test(contact.email)) {
                 const errorMsg = `Invalid email format: "${contact.email || ''}"`;
                 await logActivity('Update email configuration', { status: 'FAILURE', details: errorMsg });
                 return NextResponse.json({ message: errorMsg }, { status: 400 });
            }
            if (seenEmails.has(contact.email)) {
                 const errorMsg = `Duplicate email found: "${contact.email}"`;
                 await logActivity('Update email configuration', { status: 'FAILURE', details: errorMsg });
                 return NextResponse.json({ message: errorMsg }, { status: 400 });
            }
            seenEmails.add(contact.email);
        }

        const jsonData = JSON.stringify(updatedEmails, null, 2);
        
        await fs.writeFile(emailConfigPath, jsonData, 'utf-8');
        
        await logActivity('Email configuration updated', { status: 'SUCCESS' });
        return NextResponse.json({ message: "Email configuration updated successfully." });

    } catch (error) {
        await logActivity('Failed to write email config', { status: 'FAILURE', details: error });
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Could not update email configuration.", error: message }, { status: 500 });
    }
}
