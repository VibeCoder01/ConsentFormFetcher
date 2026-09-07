import { PDFDocument, PDFTextField, PDFDropdown, PDFRadioGroup, PDFCheckBox, StandardFonts } from 'pdf-lib';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export async function fillDocument(bytes: Uint8Array, fields: Record<string, string>): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdf.getForm();
  for (const [name, value] of Object.entries(fields)) {
    const field = form.getField(name); // Fail the operation if the template changed.
    if (field instanceof PDFTextField) {
      if (name.toLowerCase().includes('contact detail')) field.enableMultiline();
      field.setText(value);
    } else if (field instanceof PDFDropdown || field instanceof PDFRadioGroup) {
      if (!value) field.clear();
      else {
        if (!field.getOptions().includes(value)) throw new Error('Invalid PDF option.');
        field.select(value);
      }
    } else if (field instanceof PDFCheckBox) {
      if (value === 'true') field.check(); else field.uncheck();
    } else if (value) throw new Error('Unsupported PDF field.');
  }
  form.updateFieldAppearances(await pdf.embedFont(StandardFonts.Helvetica));
  return pdf.save();
}

export async function saveDocument(root: string, clinician: string, patient: string, bytes: Uint8Array) {
  if (!path.isAbsolute(root)) throw new Error('Configure an absolute consent folder path for the server operating system.');
  const safeClinician = clinician.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
  const safePatient = patient.replace(/[^a-zA-Z0-9]/g, '');
  if (!safeClinician || !safePatient) throw new Error('Clinician and patient identifier are required.');
  const directory = path.join(root, safeClinician);
  await Promise.all(['TEMP', 'RequiresPatientSignature', 'FullySigned'].map(folder => fs.mkdir(path.join(directory, folder), { recursive: true })));
  const filename = `${safePatient} RT-CONSENT-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.PDF`;
  const filePath = path.join(directory, 'TEMP', filename);
  await fs.writeFile(filePath, bytes, { flag: 'wx', mode: 0o600 });
  return filePath;
}
