
'use server';

import { PDFDocument, PDFTextField, PDFDropdown, PDFRadioGroup, PDFCheckBox, StandardFonts } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import { readAppConfig } from '@/lib/app-config';

interface FillPdfInput {
  formUrl: string;
  fields: Record<string, string>;
  patientIdentifier: string;
  formTitle: string;
  clinicianName: string;
}

export interface FillPdfOutput {
  success: boolean;
  uncPath?: string;
  error?: string;
}

export async function fillPdf(input: FillPdfInput): Promise<FillPdfOutput> {
  try {
    const { formUrl, fields: fieldsToFill, patientIdentifier, clinicianName } = input;
    const config = await readAppConfig();

    if (!config.rtConsentFolder) {
        throw new Error("RT Consent Folder path is not configured in settings.");
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
                if (fieldName.toLowerCase().includes('contact detail')) {
                    field.enableMultiline();
                    if ('enableAutosizing' in field && typeof field.enableAutosizing === 'function') {
                        field.enableAutosizing();
                    }
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
                if (value.toString().toLowerCase() === 'true') {
                    field.check();
                } else {
                    field.uncheck();
                }
            }
        } catch {
            // Field not found, just log and continue
            console.warn(`Field "${fieldName}" not found in PDF, skipping.`);
        }
    }

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
    const clinicianDir = path.join(config.rtConsentFolder, safeClinicianName);
    const tempDir = path.join(clinicianDir, 'TEMP');
    const requiresPatientSignatureDir = path.join(clinicianDir, 'RequiresPatientSignature');
    const fullySignedDir = path.join(clinicianDir, 'FullySigned');
    
    // Ensure the TEMP directory is clean by removing and recreating it
    await fs.rm(tempDir, { recursive: true, force: true });
    await Promise.all([
      fs.mkdir(tempDir, { recursive: true }),
      fs.mkdir(requiresPatientSignatureDir, { recursive: true }),
      fs.mkdir(fullySignedDir, { recursive: true }),
    ]);

    // Create a unique, filesystem-safe filename for the generated consent PDF
    const safePatientId = patientIdentifier.replace(/[^a-zA-Z0-9]/g, '');
    const now = new Date();
    const dateTimeStamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('') + '-' + [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    const fileName = `${safePatientId} RT-CONSENT-${dateTimeStamp}.PDF`;
    
    // Construct the final path for writing the file using the server's OS separator
    const filePathForWriting = path.join(tempDir, fileName);

    // Construct the UNC path for display using Windows backslashes
    const uncPathForDisplay = path.win32.join(tempDir, fileName);

    await fs.writeFile(filePathForWriting, pdfBytes);
    
    return { success: true, uncPath: uncPathForDisplay };
  } catch (error) {
    console.error('Failed to fill PDF:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred while processing the PDF.';
    return { success: false, error: message };
  }
}
