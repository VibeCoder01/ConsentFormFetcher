
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { AdminUser, KomsResponse } from '@/lib/types';
import { logActivity } from '@/lib/logger';
import { buildKomsRequestHeaders } from '@/lib/koms-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
        const headers = buildKomsRequestHeaders(request);
        const koms = await fetch(KOMS_URL, {
            method: 'POST',
            headers,
            body: new URLSearchParams({ RNumber: 'ZZZ' }).toString(), // Dummy call
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
