'use server';
import { z } from 'zod';
import { readAppConfig } from '@/lib/app-config';
import { requireAccess } from '@/lib/authorization';
import { remoteContent } from '@/lib/remote-content';
import { fillDocument, saveDocument } from '@/lib/pdf-output';
import { trace, feedback } from '@/lib/diagnostics';

const Input = z.object({
  formUrl: z.string().url(), fields: z.record(z.string().max(10000)),
  patientIdentifier: z.string().trim().min(1).max(100),
  formTitle: z.string().max(1000), clinicianName: z.string().trim().min(1).max(200),
});
export interface FillPdfOutput { success: boolean; uncPath?: string; error?: string }
export async function fillPdf(input: z.infer<typeof Input>): Promise<FillPdfOutput> {
  return trace('pdf-fill', async () => {
    try {
      await requireAccess();
      const parsed = Input.parse(input);
      if (Object.keys(parsed.fields).length > 500) throw new Error('Too many PDF fields.');
      const config = await readAppConfig();
      await feedback('source');
      const bytes = await remoteContent(parsed.formUrl);
      await feedback('rendering', { count: Object.keys(parsed.fields).length });
      const filled = await fillDocument(bytes, parsed.fields);
      await feedback('writing', { bytes: filled.length });
      const uncPath = await saveDocument(config.rtConsentFolder, parsed.clinicianName, parsed.patientIdentifier, filled);
      await feedback('saved', { count: Object.keys(parsed.fields).length, bytes: filled.length });
      return { success: true, uncPath };
    } catch (error) {
      await feedback('failed', { error });
      return { success: false, error: 'Could not generate the PDF. Check access, required details, the template and output folder. See the feedback log.' };
    }
  });
}
