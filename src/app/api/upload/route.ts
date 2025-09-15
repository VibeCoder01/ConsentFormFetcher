
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { logActivity } from '@/lib/logger';

// Helper function to read the config
async function getConfig() {
    const configPath = path.join(process.cwd(), 'src', 'config', 'app.json');
    try {
        const jsonData = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(jsonData);
    } catch (error) {
        await logActivity("Could not read config file for upload route", { status: 'FAILURE', details: error });
        // Return a default or throw an error
        throw new Error("Server configuration is missing or unreadable.");
    }
}

async function getUniqueFilePath(destinationDir: string, originalName: string): Promise<string> {
    const parsedPath = path.parse(originalName);
    const baseName = parsedPath.name;
    const extension = parsedPath.ext;
    let finalName = originalName;
    let counter = 1;

    let destinationPath = path.join(destinationDir, finalName);

    // Node.js fs.access throws if file doesn't exist, so we wrap in a loop
    // that breaks when we find a name that doesn't exist.
    while (true) {
        try {
            await fs.access(destinationPath);
            // If access does not throw, file exists. Try a new name.
            finalName = `${baseName}_${counter}${extension}`;
            destinationPath = path.join(destinationDir, finalName);
            counter++;
        } catch (error) {
            // ENOENT means file not found, which is what we want.
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return destinationPath; // This path is unique
            }
            // Any other error should be thrown.
            throw error;
        }
    }
}


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file type. Only PDFs are allowed.' }, { status: 400 });
    }
    
    // Get config to find the destination folder
    const config = await getConfig();
    const destinationDir = config.rtConsentFolder;

    if (!destinationDir) {
        return NextResponse.json({ error: 'RT Consent Folder path is not configured in settings.' }, { status: 500 });
    }
    
    // Ensure destination directory exists
    try {
        await fs.mkdir(destinationDir, { recursive: true });
    } catch (dirError) {
         await logActivity(`Failed to create destination directory: ${destinationDir}`, { status: 'FAILURE', details: dirError });
         return NextResponse.json({ error: 'Could not access or create the destination folder.' }, { status: 500 });
    }

    // Temporarily save the file to a buffer before moving
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Determine a unique file path in the destination directory
    const finalPath = await getUniqueFilePath(destinationDir, file.name);
    const finalName = path.basename(finalPath);
    
    // Write the file to its final destination
    await fs.writeFile(finalPath, fileBuffer);
    
    const message = `File '${finalName}' uploaded successfully to the consent folder.`
    await logActivity('File Upload', { status: 'SUCCESS', details: message });
    return NextResponse.json({ success: true, message: message }, { status: 200 });

  } catch (error) {
    await logActivity('File Upload', { status: 'FAILURE', details: error });
    const message = error instanceof Error ? error.message : 'Failed to upload file.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
