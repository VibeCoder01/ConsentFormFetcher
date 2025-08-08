
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure the uploads directory exists
async function ensureUploadsDirExists() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error("Could not create uploads directory:", error);
    // This is a critical error, so we throw it to prevent the app from running in a broken state.
    throw new Error("Server setup failed: unable to create uploads directory.");
  }
}
// We call this once when the module loads
ensureUploadsDirExists();


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const overwrite = req.nextUrl.searchParams.get('overwrite') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file type. Only PDFs are allowed.' }, { status: 400 });
    }

    const filePath = path.join(UPLOADS_DIR, file.name);

    // Check for existing file
    try {
      await fs.access(filePath); // This will throw if the file doesn't exist
      const fileExists = true;

      if (fileExists && !overwrite) {
        // 409 Conflict: File exists and overwrite is not requested
        return NextResponse.json(
          { 
            error: 'File with this name already exists.',
            clash: true,
          }, 
          { status: 409 }
        );
      }
    } catch (error) {
       // File doesn't exist, which is fine. We can proceed.
       // We only care about the access check error, any other fs error should be thrown.
       if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
           throw error;
       }
    }
    
    // Write the file (either new or overwriting)
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, fileBuffer);
    
    const message = overwrite ? `File '${file.name}' overwritten successfully.` : `File '${file.name}' uploaded successfully.`
    return NextResponse.json({ success: true, message: message }, { status: 200 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 });
  }
}
