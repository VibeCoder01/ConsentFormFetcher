
'use server';
/**
 * @fileOverview A flow for checking and applying updates to consent forms.
 *
 * - checkForFormUpdates - Scrapes RCR website, compares with local JSON, and reports if updates are available.
 * - updateForms - Overwrites the local JSON file with new form data.
 */

import { scrapeRcrForms } from '@/ai/flows/scrape-forms-flow';
import type { ConsentFormCategory } from '@/lib/types';
import config from '@/config/app.json';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface UpdateCheckResult {
  hasUpdates: boolean;
  newData?: ConsentFormCategory[];
}

export async function checkForFormUpdates(): Promise<UpdateCheckResult> {
  const jsonFilePath = path.join(process.cwd(), 'public', 'consent-forms.json');

  try {
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
    } catch (error) {
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
    console.error('Error checking for form updates:', error);
    return { hasUpdates: false };
  }
}

export async function updateForms(newData: ConsentFormCategory[]): Promise<{ success: boolean }> {
  try {
    const jsonFilePath = path.join(process.cwd(), 'public', 'consent-forms.json');
    const jsonData = JSON.stringify(newData, null, 2);
    await fs.writeFile(jsonFilePath, jsonData, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Failed to write updated forms to JSON:', error);
    return { success: false };
  }
}
