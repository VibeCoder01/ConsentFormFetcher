
'use server';

import { z } from 'zod';
import { PDFDocument, PDFTextField, PDFDropdown, PDFRadioGroup, PDFCheckBox, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import * as fs from 'fs/promises';
import * as path from 'path';

const FillPdfInputSchema = z.object({
  formUrl: z.string().url(),
  patient: z.object({
    surname: z.string(),
    forename: z.string(),
    dob: z.string(),
    addr1: z.string(),
    addr2: z.string(),
    addr3: z.string(),
    postcode: z.string(),
    fullAddress: z.string(),
    homePhone: z.string(),
    gpName: z.string(),
    hospitalName: z.string(),
    rNumber: z.string(),
    nhsNumber: z.string(),
    hospitalNumber: z.string(),
    hospitalNumberMTW: z.string(),
    selectedIdentifier: z.string(),
    uniqueIdentifierValue: z.string()
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
    const fullName = `${patient.forename} ${patient.surname}`;
    const formattedDob = format(new Date(patient.dob), 'dd/MM/yyyy');

    const fieldsToFill = {
        ...patient,
        dob: formattedDob,
        fullName: fullName
    };

    const fieldMapping: { [key: string]: string[] } = {
        fullName: [
          'Patient Name',
          'Patient name',
          'Patients Name',
          "Patient's Name",
          'PatientName',
          'Name of patient',
          'Patient full name',
          'topmostSubform[0].Page1[0].p1-f1-1[0]'
        ],
        forename: ['First name(s)', 'Forename', 'Patient’s first name'],
        surname: ['Last name', 'Patient’s last name', 'Surname'],
        dob: ['Date of birth', 'Patient’s date of birth (DD/MM/YYYY)'],
        hospitalNumber: ['Hospital Number', 'Patient’s hospital number'],
        hospitalNumberMTW: ['Hospital Number MTW'],
        hospitalName: ['Name of hospital'],
        addr1: ['Address Line 1', 'Addr1'],
        addr2: ['Address Line 2', 'Addr2'],
        addr3: ['Address Line 3', 'Addr3'],
        postcode: ['Postcode'],
        fullAddress: ['Address'],
        homePhone: ['Home Phone', 'Home Telephone Number'],
        gpName: ['GP Name'],
        rNumber: ['R Number'],
        nhsNumber: ['NHS Number'],
        uniqueIdentifierValue: ['Patient unique identifier', 'Unique Patient Identifier'],
    };

    const fields = form.getFields();
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const [dataKey, possibleNames] of Object.entries(fieldMapping)) {
        let fieldToSet = null;

        // Priority 1: Find an exact match (case-insensitive)
        for (const name of possibleNames) {
            const exactMatchField = fields.find(f => normalize(f.getName()) === normalize(name));
            if (exactMatchField) {
                fieldToSet = exactMatchField;
                break;
            }
        }

        // Priority 2: Find a field that includes the name (more fuzzy)
        if (!fieldToSet) {
             for (const name of possibleNames) {
                const partialMatchField = fields.find(f => normalize(f.getName()).includes(normalize(name)));
                if (partialMatchField) {
                    fieldToSet = partialMatchField;
                    break;
                }
            }
        }
        
        if (fieldToSet) {
            const value = fieldsToFill[dataKey as keyof typeof fieldsToFill];
            
            if (fieldToSet instanceof PDFTextField) {
                fieldToSet.setText(value);
            } else if (fieldToSet instanceof PDFDropdown && !fieldToSet.isMultiselect()) {
                const options = fieldToSet.getOptions();
                if (options.includes(value)) {
                   fieldToSet.select(value);
                }
            } else if (fieldToSet instanceof PDFRadioGroup) {
                 const options = fieldToSet.getOptions();
                 if (options.includes(value)) {
                    fieldToSet.select(value);
                 }
            } else if (fieldToSet instanceof PDFCheckBox) {
                // Logic to decide when to check a box would be needed here
            }
        }
    }

    // Ensure text will be visible in PDF viewers by updating field appearances
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    form.updateFieldAppearances(font)


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
