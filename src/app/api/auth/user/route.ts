
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { AdminUser, KomsResponse } from '@/lib/types';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const KOMS_URL = process.env.KOMS_URL;
const adminsConfigPath = path.join(process.cwd(), 'src', 'config', 'admins.json');

// Helper to read admins config
async function getAdmins(): Promise<AdminUser[]> {
    try {
        const jsonData = await fs.readFile(adminsConfigPath, 'utf-8');
        return JSON.parse(jsonData);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return []; // No admins file means no one has access
        }
        await logActivity("Could not read admin config", { status: 'FAILURE', details: error });
        return []; // Fail securely
    }
}

// Function to get current user from KOMS
async function getKomsUser(request: NextRequest): Promise<KomsResponse | null> {
    if (!KOMS_URL) {
        await logActivity("KOMS auth check", { status: 'FAILURE', details: 'KOMS_URL is not configured.' });
        return null;
    }
    try {
        const cookieHeader = request.headers.get('cookie') ?? undefined;
        const headers: Record<string, string> = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)'
        };

        if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
        }

        const koms = await fetch(KOMS_URL, {
            method: 'POST',
            headers,
            body: 'RNumber=ZZZ', // Dummy call
            cache: 'no-store' // Disable caching
        });

        if (!koms.ok) {
            await logActivity("KOMS auth check", { status: 'FAILURE', details: `KOMS responded ${koms.status}` });
            return null;
        }
        
        const h = koms.headers;
        return {
            user: h.get('SessionUserid'),
        } as KomsResponse;

    } catch (error) {
        await logActivity("KOMS auth check", { status: 'FAILURE', details: error });
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        const komsUser = await getKomsUser(request);
        const komsUsername = komsUser?.user?.toLowerCase();

        if (!komsUsername) {
            await logActivity(`Config page access`, { status: 'DENIED', details: "Could not determine KOMS username or user not logged in." });
            return NextResponse.json({ message: "Could not determine KOMS username or not logged in." }, { status: 401 });
        }
        
        const admins = await getAdmins();
        const adminEntry = admins.find(admin => admin.username.toLowerCase() === komsUsername);

        if (!adminEntry) {
            await logActivity(`Config page access`, { status: 'DENIED', details: "User is not an authorized administrator." });
            return NextResponse.json({ message: "Access Denied. You are not an authorized administrator." }, { status: 401 });
        }

        await logActivity(`Config page access`, { status: 'SUCCESS', details: `Access granted with level: ${adminEntry.accessLevel}` });
        // Return the admin user object which includes their access level
        return NextResponse.json(adminEntry);

    } catch (error) {
        await logActivity("User authentication", { status: 'FAILURE', details: error });
        return NextResponse.json({ message: "An internal server error occurred during authentication." }, { status: 500 });
    }
}
