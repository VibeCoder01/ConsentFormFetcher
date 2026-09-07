import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fillDocument, saveDocument } from '@/lib/pdf-output';

describe('PDF integrity', () => {
  it('clears existing text, radio and dropdown values', async () => {
    const source = await PDFDocument.create();
    const page = source.addPage();
    const form = source.getForm();
    const witness = form.createTextField('Witness'); witness.addToPage(page); witness.setText('Old witness');
    const dropdown = form.createDropdown('Choice'); dropdown.addOptions(['A', 'B']); dropdown.addToPage(page); dropdown.select('A');
    const radio = form.createRadioGroup('Radio'); radio.addOptionToPage('Yes', page); radio.select('Yes');
    const filled = await PDFDocument.load(await fillDocument(await source.save(), { Witness: '', Choice: '', Radio: '' }));
    expect(filled.getForm().getTextField('Witness').getText() || '').toBe('');
    expect(filled.getForm().getDropdown('Choice').getSelected()).toEqual([]);
    expect(filled.getForm().getRadioGroup('Radio').getSelected()).toBeUndefined();
  });
  it('rejects mismatched templates instead of silently omitting fields', async () => {
    const source = await PDFDocument.create(); source.addPage();
    await expect(fillDocument(await source.save(), { Missing: 'Synthetic' })).rejects.toThrow();
  });
  it('preserves all documents during concurrent and sequential generation', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'consent-test-'));
    try {
      const bytes = new Uint8Array([1, 2, 3]);
      const outputs = await Promise.all(Array.from({ length: 12 }, () => saveDocument(root, 'Test Clinician', 'TEST123', bytes)));
      outputs.push(await saveDocument(root, 'Test Clinician', 'TEST123', bytes));
      expect(new Set(outputs).size).toBe(13);
      for (const file of outputs) expect(await fs.readFile(file)).toEqual(Buffer.from(bytes));
      expect(await fs.readdir(path.join(root, 'Test_Clinician', 'TEMP'))).toHaveLength(13);
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });
  it('rejects missing identifiers and relative output paths', async () => {
    await expect(saveDocument('relative', 'Doctor', 'R123', new Uint8Array())).rejects.toThrow();
    await expect(saveDocument(os.tmpdir(), 'Doctor', '../', new Uint8Array())).rejects.toThrow();
  });
});
