
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { AdminUser, KomsResponse } from '@/lib/types';

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
        console.error("Could not read admin config:", error);
        return []; // Fail securely
    }
}

// Function to get current user from KOMS
async function getKomsUser(): Promise<KomsResponse | null> {
    if (!KOMS_URL) {
        console.error("KOMS_URL is not configured.");
        return null;
    }
    try {
        const koms = await fetch(KOMS_URL, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)'
            },
            body: 'RNumber=ZZZ', // Dummy call
            cache: 'no-store' // Disable caching
        });

        if (!koms.ok) return null;
        
        const h = koms.headers;
        return {
            user: h.get('SessionUserid'),
        } as KomsResponse;

    } catch (error) {
        console.error("Failed to contact KOMS for user auth:", error);
        return null;
    }
}

export async function GET() {
    try {
        const komsUser = await getKomsUser();
        const komsUsername = komsUser?.user?.toLowerCase();

        if (!komsUsername) {
            return NextResponse.json({ message: "Could not determine KOMS username or not logged in." }, { status: 401 });
        }
        
        const admins = await getAdmins();
        const adminEntry = admins.find(admin => admin.username.toLowerCase() === komsUsername);

        if (!adminEntry) {
            return NextResponse.json({ message: "Access Denied. You are not an authorized administrator." }, { status: 401 });
        }

        // Return the admin user object which includes their access level
        return NextResponse.json(adminEntry);

    } catch (error) {
        console.error("Error during user authentication:", error);
        return NextResponse.json({ message: "An internal server error occurred during authentication." }, { status: 500 });
    }
}
