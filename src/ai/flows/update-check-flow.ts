'use server';
import { feedback, trace } from '@/lib/diagnostics';


import { requireAccess } from '@/lib/authorization';
import { allowedRemoteUrl } from '@/lib/remote-content';
import { updateCache } from '@/ai/util/cache';
import { z } from 'zod';
/**
 * @fileOverview A flow for checking and applying updates to consent forms.
 *
 * - checkForFormUpdates - Scrapes RCR website, compares with local JSON, and reports if updates are available.
 * - updateForms - Overwrites the local JSON file with new form data.
 */

import { scrapeRcrForms } from '@/ai/flows/scrape-forms-flow';
import { readAppConfig } from '@/lib/app-config';
import type { ConsentFormCategory } from '@/lib/types';
import * as fs from 'fs/promises';
import { formsFile } from '@/lib/config-path';

export interface UpdateCheckResult {
  hasUpdates: boolean;
  newData?: ConsentFormCategory[];
}

async function checkForFormUpdatesInternal(): Promise<UpdateCheckResult> {
  const jsonFilePath = formsFile;

  try {
    await requireAccess('read', true);
    const config = await readAppConfig();
    // 1. Scrape the website for the latest forms
    const scrapeResult = await scrapeRcrForms(config.rcrConsentFormsUrl);
    if (!scrapeResult.success || !scrapeResult.newData) {
      // If scraping fails, assume no updates are available to avoid errors.
      return { hasUpdates: false };
    }
    const newForms = scrapeResult.newData;

    // 2. Read the existing local forms
    let existingForms: ConsentFormCategory[] = [];
    try {
      const jsonData = await fs.readFile(jsonFilePath, 'utf-8');
      existingForms = JSON.parse(jsonData);
    } catch {
      // If the file doesn't exist or is invalid, we'll treat it as an update.
    }

    // 3. Compare the two datasets (simple string comparison of JSON)
    const newFormsString = JSON.stringify(newForms);
    const existingFormsString = JSON.stringify(existingForms);
    
    if (newFormsString === existingFormsString) {
      return { hasUpdates: false };
    }

    return { hasUpdates: true, newData: newForms };
  } catch (error) {
    await feedback('failed', { error });
    return { hasUpdates: false };
  }
}

async function updateFormsInternal(newData: ConsentFormCategory[]): Promise<{ success: boolean }> {
  try {
    await requireAccess('change', true);
    newData = z.array(z.object({ category: z.string().max(200), forms: z.array(z.object({ title: z.string().max(1000), url: z.string().url().refine(value => { try { allowedRemoteUrl(value); return true; } catch { return false; } }) })).max(500) })).max(100).parse(newData);
    const jsonFilePath = formsFile;
    const jsonData = JSON.stringify(newData, null, 2);
    await fs.writeFile(jsonFilePath, jsonData, 'utf-8');
    updateCache(newData);
    return { success: true };
  } catch (error) {
    await feedback('failed', { error });
    return { success: false };
  }
}

export async function checkForFormUpdates(): Promise<UpdateCheckResult> {
  return trace('updates', () => checkForFormUpdatesInternal());
}

export async function updateForms(newData: ConsentFormCategory[]): Promise<{ success: boolean }> {
  return trace('update-forms', () => updateFormsInternal(newData));
}
