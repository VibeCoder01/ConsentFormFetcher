import { namedItemsSchema } from '@/lib/config-schemas';
import { configDirectory } from '@/lib/config-path';
import { feedback } from '@/lib/diagnostics';
import { api } from '@/lib/authorization';

import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { TumourGroup } from '@/lib/types';

const configPath = path.join(configDirectory, 'tumour-groups.json');

async function handleGET() {
  try {
    const jsonData = await fs.readFile(configPath, 'utf-8');
    const data: TumourGroup[] = JSON.parse(jsonData);
    return NextResponse.json(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, return empty array
        return NextResponse.json([]);
    }
    await feedback('failed', { error });
    return NextResponse.json({ message: "Could not load tumour group configuration." }, { status: 500 });
  }
}

async function handlePOST(request: Request) {
    try {
        const parsed = namedItemsSchema.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ message: "Invalid configuration values." }, { status: 400 });
        const updatedGroups = parsed.data;
        
        if (!Array.isArray(updatedGroups)) {
            return NextResponse.json({ message: "Invalid data format. Expected an array of tumour groups." }, { status: 400 });
        }

        const jsonData = JSON.stringify(updatedGroups, null, 2);
        
        await fs.writeFile(configPath, jsonData, 'utf-8');
        
        return NextResponse.json({ message: "Tumour group configuration updated successfully." });

    } catch (error) {
        await feedback('failed', { error });
        const message = 'Operation failed. See the feedback log for diagnostic details.';
        return NextResponse.json({ message: "Could not update tumour group configuration.", error: message }, { status: 500 });
    }
}

export const GET = api('tumour-groups', 'read', handleGET, true);

export const POST = api('tumour-groups', 'change', handlePOST, true);
