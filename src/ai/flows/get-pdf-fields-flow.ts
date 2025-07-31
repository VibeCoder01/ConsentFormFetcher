
'use server';
/**
 * @fileOverview A flow for extracting all fillable field names from a PDF.
 *
 * - getPdfFields - Fetches a PDF and returns the names of its form fields.
 */

import { PDFDocument } from 'pdf-lib';

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
    const existingPdfBytes = await fetch(formUrl).then((res) => {
        if (!res.ok) {
            throw new Error(`Failed to fetch PDF. Status: ${res.status} ${res.statusText}`);
        }
        return res.arrayBuffer()
    });

    // 2. Load the PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(existingPdfBytes, { 
        // Some PDFs can have update sections that corrupt them if not handled
        updateMetadata: false 
    });
    const form = pdfDoc.getForm();

    // 3. Get all field names
    const fields = form.getFields();
    const fieldNames = fields.map(field => field.getName());

    return { success: true, fields: fieldNames };
  } catch (error) {
    console.error('Failed to get PDF fields:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred while processing the PDF.';
    return { success: false, error: message };
  }
}

    