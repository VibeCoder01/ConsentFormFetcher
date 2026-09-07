import { emailsSchema } from '@/lib/config-schemas';
import { configDirectory } from '@/lib/config-path';
import { feedback } from '@/lib/diagnostics';
import { api } from '@/lib/authorization';

import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { EmailContact } from '@/lib/types';

const emailConfigPath = path.join(configDirectory, 'email.json');

// Basic email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleGET() {
  try {
    const jsonData = await fs.readFile(emailConfigPath, 'utf-8');
    const data: EmailContact[] = JSON.parse(jsonData);
    return NextResponse.json(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, return empty array
        return NextResponse.json([]);
    }
    await feedback('failed', { error });
    return NextResponse.json({ message: "Could not load email configuration." }, { status: 500 });
  }
}

async function handlePOST(request: Request) {
    try {
        const parsed = emailsSchema.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ message: "Invalid configuration values." }, { status: 400 });
        const updatedEmails = parsed.data;
        
        if (!Array.isArray(updatedEmails)) {
            return NextResponse.json({ message: "Invalid data format. Expected an array of email contacts." }, { status: 400 });
        }

        const seenEmails = new Set<string>();
        for (const contact of updatedEmails) {
            if (!contact.email || !emailRegex.test(contact.email)) {
                 return NextResponse.json({ message: `Invalid email format: "${contact.email || ''}"` }, { status: 400 });
            }
            if (seenEmails.has(contact.email)) {
                 return NextResponse.json({ message: `Duplicate email found: "${contact.email}"` }, { status: 400 });
            }
            seenEmails.add(contact.email);
        }

        const jsonData = JSON.stringify(updatedEmails, null, 2);
        
        await fs.writeFile(emailConfigPath, jsonData, 'utf-8');
        
        return NextResponse.json({ message: "Email configuration updated successfully." });

    } catch (error) {
        await feedback('failed', { error });
        const message = 'Operation failed. See the feedback log for diagnostic details.';
        return NextResponse.json({ message: "Could not update email configuration.", error: message }, { status: 500 });
    }
}

export const GET = api('email', 'read', handleGET, true);

export const POST = api('email', 'change', handlePOST, true);
