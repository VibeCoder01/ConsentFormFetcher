
'use server';

import { z } from 'zod';
import { PDFDocument, PDFTextField, PDFDropdown, PDFRadioGroup, PDFCheckBox, StandardFonts } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';

const FillPdfInputSchema = z.object({
  formUrl: z.string().url(),
  fields: z.record(z.string()), // Flexible key-value pairs
});
type FillPdfInput = z.infer<typeof FillPdfInputSchema>;

export interface FillPdfOutput {
  success: boolean;
  pdfId?: string;
  error?: string;
}

export async function fillPdf(input: FillPdfInput): Promise<FillPdfOutput> {
  try {
    const { formUrl, fields: fieldsToFill } = input;

    // 1. Fetch the PDF from the URL
    const existingPdfBytes = await fetch(formUrl).then((res) => res.arrayBuffer());

    // 2. Load the PDF with pdf-lib, ignoring encryption
    const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    // 3. Fill in the fields based on the provided key-value pairs
    for (const [fieldName, value] of Object.entries(fieldsToFill)) {
        if (value === undefined || value === null || value === '') continue;

        try {
            const field = form.getField(fieldName);
            
            if (field instanceof PDFTextField) {
                if (fieldName.toLowerCase().includes('contact')) {
                    field.setFontSize(8); // Set a smaller font size
                }
                field.setText(value.toString());
            } else if (field instanceof PDFDropdown && !field.isMultiselect()) {
                const options = field.getOptions();
                if (options.includes(value.toString())) {
                   field.select(value.toString());
                }
            } else if (field instanceof PDFRadioGroup) {
                 const options = field.getOptions();
                 if (options.includes(value.toString())) {
                    field.select(value.toString());
                 }
            } else if (field instanceof PDFCheckBox) {
                // To support checkboxes, the value would need to be a boolean-like string e.g., "true"
                if (value.toString().toLowerCase() === 'true') {
                    field.check();
                } else {
                    field.uncheck();
                }
            }
        } catch(e) {
            // Field not found, just log and continue
            console.warn(`Field "${fieldName}" not found in PDF, skipping.`);
        }
    }

    // Ensure text will be visible in PDF viewers by updating field appearances
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    try {
        form.updateFieldAppearances(font);
    } catch (fontError) {
        console.warn("Could not update field appearances with default font. Trying to flatten.", fontError);
        // As a fallback for some problematic PDFs, we can flatten.
        // This makes fields uneditable but ensures visibility.
        try {
            form.flatten();
        } catch (flattenError) {
            console.error("Fallback to flatten also failed.", flattenError);
        }
    }


    // 4. Save the modified PDF to bytes
    const pdfBytes = await pdfDoc.save();

    // 5. Save the PDF to a temporary file
    const pdfId = crypto.randomUUID();
    const tmpDir = path.join(process.cwd(), 'tmp');
    // Ensure the tmp directory exists
    await fs.mkdir(tmpDir, { recursive: true });
    const filePath = path.join(tmpDir, `${pdfId}.pdf`);
    await fs.writeFile(filePath, pdfBytes);
    

    return { success: true, pdfId: pdfId };
  } catch (error) {
    console.error('Failed to fill PDF:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred while processing the PDF.';
    return { success: false, error: message };
  }
}

    