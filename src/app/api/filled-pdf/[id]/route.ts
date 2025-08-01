
import { NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs/promises';

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = params;

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
      },
    });

    // We will not delete the file immediately to avoid race conditions.
    // A separate cleanup mechanism would be needed for a production environment.
    // await fs.unlink(filePath);

    return response;

  } catch (error) {
     if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({ error: 'PDF not found or expired' }, { status: 404 });
     }
     console.error(`Failed to serve PDF ${id}:`, error);
     return NextResponse.json({ error: 'Failed to retrieve PDF' }, { status: 500 });
  }
}
