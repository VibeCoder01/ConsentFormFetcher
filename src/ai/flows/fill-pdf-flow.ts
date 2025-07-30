'use server';

import { z } from 'zod';
import { PDFDocument, PDFTextField, PDFDropdown, PDFRadioGroup, PDFCheckBox } from 'pdf-lib';
import { PatientData } from '@/lib/types';
import { format } from 'date-fns';

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
  pdfDataUri?: string;
  error?: string;
}

// A simple mapping from our patient data keys to potential PDF field names.
// This is a naive implementation and would need to be more robust in a real application.
const fieldMappings: { [key in keyof PatientData]: string[] } = {
  firstName: ['Patient First Name', 'First Name', 'patient_first_name'],
  lastName: ['Patient Last Name', 'Last Name', 'Surname', 'patient_last_name'],
  dob: ['Patient Date of Birth', 'Date of Birth', 'DOB', 'patient_dob'],
  hospitalNumber: ['Hospital Number', 'Patient ID', 'MRN', 'hospital_no'],
};


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
                    // This is a simplification. Dropdowns often need specific option names.
                    const options = field.getOptions();
                    if (options.includes(value)) {
                       field.select(value);
                    }
                } else if (field instanceof PDFRadioGroup) {
                    // This is a simplification. Radio groups need specific option names.
                     const options = field.getOptions();
                     if (options.includes(value)) {
                        field.select(value);
                     }
                } else if (field instanceof PDFCheckBox) {
                    // You'd need logic to decide when to check a box.
                    // e.g. if (value === 'Yes') field.check();
                }

                break; 
            }
        }
    });

    // 4. Save the modified PDF to bytes
    const pdfBytes = await pdfDoc.save();

    // 5. Convert to a data URI to send to the client
    const pdfDataUri = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;

    return { success: true, pdfDataUri };
  } catch (error) {
    console.error('Failed to fill PDF:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred while processing the PDF.';
    return { success: false, error: message };
  }
}
