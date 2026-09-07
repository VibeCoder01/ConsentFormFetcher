import { namedItemsSchema } from '@/lib/config-schemas';
import { configDirectory } from '@/lib/config-path';
import { feedback } from '@/lib/diagnostics';
import { api } from '@/lib/authorization';

import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { TumourSite } from '@/lib/types';

const configPath = path.join(configDirectory, 'tumour-sites.json');

async function handleGET() {
  try {
    const jsonData = await fs.readFile(configPath, 'utf-8');
    const data: TumourSite[] = JSON.parse(jsonData);
    return NextResponse.json(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, return empty array
        return NextResponse.json([]);
    }
    await feedback('failed', { error });
    return NextResponse.json({ message: "Could not load tumour site configuration." }, { status: 500 });
  }
}

async function handlePOST(request: Request) {
    try {
        const parsed = namedItemsSchema.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ message: "Invalid configuration values." }, { status: 400 });
        const updatedSites = parsed.data;
        
        if (!Array.isArray(updatedSites)) {
            return NextResponse.json({ message: "Invalid data format. Expected an array of tumour sites." }, { status: 400 });
        }

        const jsonData = JSON.stringify(updatedSites, null, 2);
        
        await fs.writeFile(configPath, jsonData, 'utf-8');
        
        return NextResponse.json({ message: "Tumour site configuration updated successfully." });

    } catch (error) {
        await feedback('failed', { error });
        const message = 'Operation failed. See the feedback log for diagnostic details.';
        return NextResponse.json({ message: "Could not update tumour site configuration.", error: message }, { status: 500 });
    }
}

export const GET = api('tumour-sites', 'read', handleGET, true);

export const POST = api('tumour-sites', 'change', handlePOST, true);
