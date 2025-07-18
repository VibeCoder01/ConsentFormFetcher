'use server';
/**
 * @fileOverview A flow for extracting fields from and filling a PDF consent form.
 *
 * - fillConsentForm - The primary function to interact with the flow.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  FillParams,
  FillParamsSchema,
  FillResult,
  FillResultSchema,
  FormField,
  FormFieldSchema,
} from '@/lib/types';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// The main exported function that clients will call
export async function fillConsentForm(params: FillParams): Promise<FillResult> {
  return fillConsentFormFlow(params);
}

// Define the Genkit prompt for extracting form fields
const fieldExtractionPrompt = ai.definePrompt({
  name: 'fieldExtractionPrompt',
  input: { schema: z.object({ pdfUrl: z.string() }) },
  output: { schema: z.object({ fields: z.array(FormFieldSchema) }) },
  prompt: `Analyze the PDF document found at the URL below. Identify all the user-fillable fields (like text inputs, checkboxes, signature areas).

For each field, provide:
1.  A unique camelCase \`name\`.
2.  A user-friendly \`description\` that can be used as a label.
3.  The \`type\` of data expected (string, date, number).

Do not include fields that are clearly for administrative use only. Focus on patient or subject information.

PDF Document:
{{media url=pdfUrl}}
`,
  config: {
    // A larger model is better for this kind of complex document analysis
    model: 'googleai/gemini-1.5-pro',
  },
});

// Define the Genkit flow
const fillConsentFormFlow = ai.defineFlow(
  {
    name: 'fillConsentFormFlow',
    inputSchema: FillParamsSchema,
    outputSchema: FillResultSchema,
  },
  async (params) => {
    // If no fields are provided, extract them using AI
    if (!params.fields) {
      const { output } = await fieldExtractionPrompt({ pdfUrl: params.pdfUrl });
      return { fields: output?.fields };
    }

    // If fields are provided, fetch the PDF and fill them
    const pdfBytes = await fetch(params.pdfUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      // This is important for some PDFs that might not be perfectly standard
      ignoreEncryption: true,
    });

    // Register fontkit to handle custom fonts potentially embedded in the PDF
    pdfDoc.registerFontkit(fontkit);

    // Use a standard font as a fallback
    const helveticaFont = await pdfDoc.embedFont('Helvetica');
    const pages = pdfDoc.getPages();
    const firstPage = pages[0]; // Assuming we fill fields on the first page

    // Define the prompt for finding field coordinates
    const fieldPlacementPrompt = ai.definePrompt({
      name: 'fieldPlacementPrompt',
      input: {
        schema: z.object({
          pdfUrl: z.string(),
          fields: z.array(FormFieldSchema),
        }),
      },
      output: {
        schema: z.object({
          placements: z.array(
            z.object({
              name: z.string(),
              x: z.number().describe('The x-coordinate from the left edge of the page.'),
              y: z.number().describe('The y-coordinate from the bottom edge of the page.'),
            })
          ),
        }),
      },
      prompt: `Based on the provided PDF, identify the precise x and y coordinates for each of the following form fields on the first page.
        The origin (0,0) is the bottom-left corner of the page.
        The page dimensions are ${firstPage.getWidth()}pt wide and ${firstPage.getHeight()}pt high.
        Provide coordinates for placing the *start* of the text for each field.

        PDF Document:
        {{media url=pdfUrl}}

        Fields:
        {{#each fields}}
        - {{name}}: "{{description}}"
        {{/each}}
        `,
      config: { model: 'googleai/gemini-1.5-pro' },
    });

    const { output: placementOutput } = await fieldPlacementPrompt({
      pdfUrl: params.pdfUrl,
      fields: params.fields,
    });

    if (!placementOutput) {
      throw new Error('Could not determine field placements.');
    }

    // Draw the text on the PDF
    placementOutput.placements.forEach((p) => {
      const field = params.fields?.find((f) => f.name === p.name);
      if (field?.value) {
        firstPage.drawText(field.value, {
          x: p.x,
          y: p.y,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0.2, 0.8),
        });
      }
    });

    // Save the PDF to a buffer and convert to a data URI
    const filledPdfBytes = await pdfDoc.save();
    const filledPdfBase64 = Buffer.from(filledPdfBytes).toString('base64');

    return {
      filledPdfDataUri: `data:application/pdf;base64,${filledPdfBase64}`,
    };
  }
);
