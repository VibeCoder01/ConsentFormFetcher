'use server';

import { z } from 'zod';
import { PDFDocument, PDFTextField, PDFDropdown, PDFRadioGroup, PDFCheckBox } from 'pdf-lib';
import { format } from 'date-fns';
import * as fs from 'fs/promises';
import * as path from 'path';

const FillPdfInputSchema = z.object({
  formUrl: z.string().url(),
  patient: z.object({
    firstName: z.string(),
    lastName: z.string(),
    dob: z.string(),
    hospitalNumber: z.string(),
  }),
});
type FillPdfInput = z.infer<typeof FillPdfInputSchema>;

export interface FillPdfOutput {
  success: boolean;
  pdfId?: string;
  error?: string;
}

export async function fillPdf(input: FillPdfInput): Promise<FillPdfOutput> {
  try {
    const { formUrl, patient } = input;

    // 1. Fetch the PDF from the URL
    const existingPdfBytes = await fetch(formUrl).then((res) => res.arrayBuffer());

    // 2. Load the PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    // 3. Fill in the fields
    const fullName = `${patient.firstName} ${patient.lastName}`;
    const formattedDob = format(new Date(patient.dob), 'dd/MM/yyyy');

    const fieldsToFill = {
        ...patient,
        dob: formattedDob,
        fullName: fullName
    };

    const fieldMapping: { [key: string]: string[] } = {
        firstName: ['First name(s)', 'Patient’s first name'],
        lastName: ['Last name', 'Patient’s last name'],
        fullName: ['Patient Name', 'Name of patient'],
        dob: ['Date of birth', 'Patient’s date of birth (DD/MM/YYYY)'],
        hospitalNumber: ['Hospital Number', 'Patient’s hospital number'],
    };

    form.getFields().forEach(field => {
        const fieldName = field.getName();
        
        for (const [dataKey, possibleNames] of Object.entries(fieldMapping)) {
            if (possibleNames.some(name => fieldName.toLowerCase().includes(name.toLowerCase()))) {
                const value = fieldsToFill[dataKey as keyof typeof fieldsToFill];
                
                if (field instanceof PDFTextField) {
                    field.setText(value);
                } else if (field instanceof PDFDropdown && !field.isMultiselect()) {
                    const options = field.getOptions();
                    if (options.includes(value)) {
                       field.select(value);
                    }
                } else if (field instanceof PDFRadioGroup) {
                     const options = field.getOptions();
                     if (options.includes(value)) {
                        field.select(value);
                     }
                } else if (field instanceof PDFCheckBox) {
                    // Logic to decide when to check a box would be needed here
                }
                break; 
            }
        }
    });

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
