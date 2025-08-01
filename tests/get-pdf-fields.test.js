import "./setup.js";
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { getPdfFields } from '../test-dist/ai/flows/get-pdf-fields-flow.js';

test('getPdfFields returns text field names only', async () => {
  const pdfDoc = await PDFDocument.create();
  const form = pdfDoc.getForm();
  form.createTextField('patient_name');
  form.createCheckBox('agree');
  const pdfBytes = await pdfDoc.save();

  global.fetch = async () => ({ ok: true, arrayBuffer: async () => pdfBytes });

  const result = await getPdfFields('https://example.com/form.pdf');
  assert.equal(result.success, true);
  assert.deepEqual(result.fields, ['patient_name']);
});
