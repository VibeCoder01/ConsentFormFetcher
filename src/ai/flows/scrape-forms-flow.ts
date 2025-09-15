
'use server';
/**
 * @fileOverview A flow for scraping RCR consent forms from their website.
 *
 * - scrapeRcrForms - Scrapes the RCR website for consent form links.
 * - ScrapeRcrFormsOutput - The return type for the scrapeRcrForms function.
 */

import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConsentForm, ConsentFormCategory } from '@/lib/types';
import { updateCache } from '@/ai/util/cache';
import { logActivity } from '@/lib/logger';

// Helper function to read the config to avoid direct imports in server-side code
async function getConfig() {
    const configPath = path.join(process.cwd(), 'src', 'config', 'app.json');
    const jsonData = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(jsonData);
}

export interface ScrapeRcrFormsOutput {
  success: boolean;
  formCount?: number;
  error?: string;
  newData?: ConsentFormCategory[];
}

async function saveFormsToJson(data: ConsentFormCategory[]): Promise<void> {
    const jsonFilePath = path.join(process.cwd(), 'public', 'consent-forms.json');
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(jsonFilePath, jsonData, 'utf-8');
}


export async function scrapeRcrForms(url: string): Promise<ScrapeRcrFormsOutput> {
  const activity = `Scrape RCR forms from ${url}`;
  try {
    const config = await getConfig();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch the page. Status: ${response.status}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    const categories: { [key: string]: ConsentForm[] } = {};

    // Find all links that point to a PDF file within the main content area.
    $('body a[href$=".pdf"]').each((_, element) => {
      const anchor = $(element);
      const title = anchor.text().trim();
      let href = anchor.attr('href') || '';

      // Skip links without a title or href
      if (!title || !href) return;
      
      // Skip links that are likely part of site furniture rather than content
      if (title.toLowerCase().includes('download') && anchor.find('svg').length > 0) return;

      if (!href.startsWith('http')) {
        href = new URL(href, config.rcrBaseUrl).toString();
      }
      
      const form: ConsentForm = { title, url: href };
      
      // Resiliently find the nearest preceding h2 to determine the category.
      // This checks multiple common DOM patterns.
      let heading = anchor.closest('div, section, article, li').prevAll('h2').first();
      if (!heading.length) {
        heading = anchor.prevAll('h2').first();
      }
      if (!heading.length) {
        heading = anchor.parent().prevAll('h2').first();
      }
      if (!heading.length) {
        heading = anchor.parentsUntil('main, body').last().prevAll('h2').first();
      }
      if (!heading.length) {
        // Fallback to searching within the closest major content block
        const contentBlock = anchor.closest('main, #main-content, #main, .main-content, .content, article');
        heading = contentBlock.find('h2').first();
      }

      const categoryTitle = heading.text().trim() || 'General';

      if (!categories[categoryTitle]) {
        categories[categoryTitle] = [];
      }
      
      // Avoid adding duplicate URLs for the same category
      if (!categories[categoryTitle].some(f => f.url === href)) {
          categories[categoryTitle].push(form);
      }
    });
    
    const formCategories: ConsentFormCategory[] = Object.keys(categories).map(category => ({
      category: category,
      forms: categories[category],
    }));

    const totalForms = formCategories.reduce((sum, cat) => sum + cat.forms.length, 0);

    if (totalForms === 0) {
      throw new Error('No forms were extracted. The page structure may have changed, or there are no PDF links.');
    }
    
    // We no longer automatically save to JSON here. That's handled by a separate flow.
    // await saveFormsToJson(formCategories);
    
    updateCache(formCategories);

    await logActivity(activity, { status: 'SUCCESS', details: `Found ${totalForms} forms.` });
    return { success: true, formCount: totalForms, newData: formCategories };
  } catch (error) {
    await logActivity(activity, { status: 'FAILURE', details: error });
    const message = error instanceof Error ? error.message : 'An unknown error occurred during scraping.';
    return { success: false, error: message };
  }
}
