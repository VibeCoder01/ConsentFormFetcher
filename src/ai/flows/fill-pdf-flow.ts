
'use server';

import { z } from 'zod';
import { PDFDocument, PDFTextField, PDFDropdown, PDFRadioGroup, PDFCheckBox, StandardFonts } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';

// Helper function to read the config to avoid direct imports in server-side code
async function getConfig() {
    const configPath = path.join(process.cwd(), 'src', 'config', 'app.json');
    const jsonData = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(jsonData);
}

const FillPdfInputSchema = z.object({
  formUrl: z.string().url(),
  fields: z.record(z.string()), // Flexible key-value pairs
  patientIdentifier: z.string(),
  formTitle: z.string(),
  clinicianName: z.string(),
});
type FillPdfInput = z.infer<typeof FillPdfInputSchema>;

export interface FillPdfOutput {
  success: boolean;
  uncPath?: string;
  error?: string;
}

export async function fillPdf(input: FillPdfInput): Promise<FillPdfOutput> {
  try {
    const { formUrl, fields: fieldsToFill, patientIdentifier, formTitle, clinicianName } = input;
    const config = await getConfig();

    if (!config.tempPdfPath) {
        throw new Error("Temporary PDF path (tempPdfPath) is not configured in settings.");
    }
    
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
        try {
            form.flatten();
        } catch (flattenError) {
            console.error("Fallback to flatten also failed.", flattenError);
        }
    }

    // 4. Save the modified PDF to bytes
    const pdfBytes = await pdfDoc.save();

    // 5. Create directory structure and save the file
    const safeClinicianName = clinicianName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
    const clinicianDir = path.join(config.tempPdfPath, safeClinicianName);
    
    // Ensure the clinician-specific directory exists
    await fs.mkdir(clinicianDir, { recursive: true });

    // Create a unique filename
    const safePatientId = patientIdentifier.replace(/[^a-zA-Z0-9]/g, '');
    const safeFormTitle = formTitle.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
    const fileName = `${safePatientId}_${safeFormTitle}_filled.pdf`;
    const filePath = path.join(clinicianDir, fileName);

    await fs.writeFile(filePath, pdfBytes);
    
    return { success: true, uncPath: filePath };
  } catch (error) {
    console.error('Failed to fill PDF:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred while processing the PDF.';
    return { success: false, error: message };
  }
}
