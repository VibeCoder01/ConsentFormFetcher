import { NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs/promises';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) { // Basic validation
    return NextResponse.json({ error: 'Invalid PDF ID' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'tmp', `${id}.pdf`);

  try {
    const pdfBytes = await fs.readFile(filePath);

    // Create a response with the PDF bytes.
    const response = new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBytes.length.toString(),
        // Instructs the browser to display the file inline
        'Content-Disposition': 'inline; filename="consent-form.pdf"',
      },
    });
    
    // Clean up the file after creating the response
    await fs.unlink(filePath);

    return response;

  } catch (error) {
     if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({ error: 'PDF not found or expired' }, { status: 404 });
     }
     console.error(`Failed to serve PDF ${id}:`, error);
     return NextResponse.json({ error: 'Failed to retrieve PDF' }, { status: 500 });
  }
}
