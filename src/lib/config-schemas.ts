import { z } from 'zod';
import { allowedRemoteUrl } from './remote-content';
const text = z.string().max(2000);
const approvedUrl = z.string().url().refine(value => { try { allowedRemoteUrl(value); return true; } catch { return false; } }, 'Use an approved HTTPS source host.');
export const appSchema = z.object({
  rcrConsentFormsUrl: approvedUrl, rcrBaseUrl: approvedUrl,
  validateRNumber: z.boolean(), previewPdfFields: z.boolean(),
  pdfOpenMethod: z.enum(['browser', 'acrobat']), rtConsentFolder: text,
  prepopulateWithFakeData: z.boolean(), showWelshForms: z.boolean(), komsApiDebugMode: z.boolean(),
}).strict();
export const adSchema = z.object({
  url: z.string().refine(value => value === '' || value.startsWith('ldaps://'), 'Use LDAPS.'),
  baseDN: text, bindDN: text, bindPassword: text.optional(), caFile: text.optional(),
  groupDNs: z.object({ user: text, change: text, full: text }), mfaMachineGroup: text.optional(),
}).strict();
export const staffSchema = z.array(z.object({
  id: text.min(1), name: text.min(1), title: text, phone: text,
  speciality1: text.nullable().optional(), speciality2: text.nullable().optional(), speciality3: text.nullable().optional(), emailRecipients: text,
}).strict()).max(10000).refine(rows => new Set(rows.map(row => row.id)).size === rows.length, 'Duplicate staff IDs.');
export const namedItemsSchema = z.array(z.object({ id: text.min(1), name: text.min(1) }).strict()).max(10000).refine(rows => new Set(rows.map(row => row.id)).size === rows.length, 'Duplicate IDs.');
export const emailsSchema = z.array(z.object({ id: text.min(1), email: z.string().email().max(320) }).strict()).max(10000).refine(rows => new Set(rows.map(row => row.email.toLowerCase())).size === rows.length, 'Duplicate emails.');
