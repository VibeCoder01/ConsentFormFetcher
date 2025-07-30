import { getCachedPdf } from '@/ai/util/pdfCache';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: 'Missing PDF ID' }, { status: 400 });
  }

  const pdfBytes = getCachedPdf(id);

  if (!pdfBytes) {
    return NextResponse.json({ error: 'PDF not found or expired' }, { status: 404 });
  }

  // Create a response with the PDF bytes.
  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBytes.length.toString(),
       // Instructs the browser to display the file inline
      'Content-Disposition': 'inline; filename="consent-form.pdf"',
    },
  });
}
