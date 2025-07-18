import { z } from 'zod';

export interface ConsentForm {
  title: string;
  url: string;
}

export interface ConsentFormCategory {
  category: string;
  forms: ConsentForm[];
}

// Define the schema for a single form field
export const FormFieldSchema = z.object({
  name: z.string().describe('A unique identifier for the form field, e.g., "patientName"'),
  description: z.string().describe('A user-friendly label for the form field, e.g., "Patient Name"'),
  type: z.enum(['string', 'date', 'number']).describe('The data type of the field.'),
  value: z.string().optional().describe('The value to fill into the field.'),
});
export type FormField = z.infer<typeof FormFieldSchema>;

// Define the input schema for the flow
export const FillParamsSchema = z.object({
  pdfUrl: z.string().url().describe('The public URL of the PDF consent form.'),
  fields: z.array(FormFieldSchema).optional().describe('An array of form fields to be filled. If not provided, fields will be extracted.'),
});
export type FillParams = z.infer<typeof FillParamsSchema>;

// Define the output schema for the flow
export const FillResultSchema = z.object({
  fields: z.array(FormFieldSchema).optional().describe('The extracted form fields if no input fields were provided.'),
  filledPdfDataUri: z.string().optional().describe("The filled PDF as a base64 data URI. Provided only when input fields are passed."),
});
export type FillResult = z.infer<typeof FillResultSchema>;
