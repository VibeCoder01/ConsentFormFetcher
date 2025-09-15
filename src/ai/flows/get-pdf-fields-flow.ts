
'use a server';
/**
 * @fileOverview A flow for extracting all fillable field names from a PDF.
 *
 * - getPdfFields - Fetches a PDF and returns the names of its form fields, excluding checkboxes.
 */

import { PDFDocument, PDFCheckBox } from 'pdf-lib';
import { logActivity } from '@/lib/logger';

export interface GetPdfFieldsOutput {
  success: boolean;
  fields?: string[];
  error?: string;
}

export async function getPdfFields(formUrl: string): Promise<GetPdfFieldsOutput> {
  try {
    if (!formUrl) {
      throw new Error('Form URL is required.');
    }
    
    // 1. Fetch the PDF from the URL
    const existingPdfBytes = await fetch(formUrl, { cache: 'no-store' }).then((res) => {
        if (!res.ok) {
            throw new Error(`Failed to fetch PDF. Status: ${res.status} ${res.statusText}`);
        }
        return res.arrayBuffer()
    });

    // 2. Load the PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(existingPdfBytes, { 
        // Some PDFs can have update sections that corrupt them if not handled
        updateMetadata: false,
        // Some PDFs are encrypted, this allows us to load them
        ignoreEncryption: true,
    });
    const form = pdfDoc.getForm();

    // 3. Get all field names, filtering out checkboxes, patient initial fields, and signature fields
    const fields = form.getFields();
    const fieldNames = fields
      .filter(field => {
        const name = field.getName().toLowerCase();
        // Exclude checkboxes, signature/initials fields, and fields starting with "st " or "lt "
        return !(field instanceof PDFCheckBox) && !name.includes('initials') && !name.includes('signature') && !name.startsWith('st ') && !name.startsWith('lt ');
      })
      .map(field => field.getName());

    return { success: true, fields: fieldNames };
  } catch (error) {
    await logActivity('Failed to get PDF fields', { status: 'FAILURE', details: error });
    const message = error instanceof Error ? error.message : 'An unknown error occurred while processing the PDF.';
    return { success: false, error: message };
  }
}
