import "./setup.js";
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scrapeRcrForms } from '../test-dist/ai/flows/scrape-forms-flow.js';

const sampleHtml = `
  <html>
  <body>
    <h2>General</h2>
    <a href="https://example.com/form1.pdf">Form One</a>
  </body>
  </html>
`;

test('scrapeRcrForms extracts a PDF link', async () => {
  global.fetch = async () => ({ ok: true, text: async () => sampleHtml });
  const result = await scrapeRcrForms('https://example.com');
  assert.equal(result.success, true);
  assert.equal(result.formCount, 1);
  assert.equal(result.newData[0].category, 'General');
  assert.equal(result.newData[0].forms[0].title, 'Form One');
});
