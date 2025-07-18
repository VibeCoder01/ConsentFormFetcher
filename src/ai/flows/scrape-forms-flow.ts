'use server';
/**
 * @fileOverview A flow for scraping RCR consent forms from their website.
 *
 * - scrapeRcrForms - Scrapes the RCR website for consent form links.
 * - ScrapeRcrFormsOutput - The return type for the scrapeRcrForms function.
 */

import * as cheerio from 'cheerio';
import { ConsentForm, ConsentFormCategory } from '@/lib/types';
import { updateCache } from '@/ai/util/cache';
import config from '@/config/app.json';

export interface ScrapeRcrFormsOutput {
  success: boolean;
  formCount?: number;
  error?: string;
}

export async function scrapeRcrForms(url: string): Promise<ScrapeRcrFormsOutput> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch the page. Status: ${response.status}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    const categories: { [key: string]: ConsentForm[] } = {};

    // Find all links that point to a PDF file.
    $('#main-content a[href$=".pdf"]').each((_, element) => {
      const anchor = $(element);
      const title = anchor.text().trim();
      let href = anchor.attr('href') || '';

      if (!title || !href) return;

      if (!href.startsWith('http')) {
        href = new URL(href, config.rcrBaseUrl).toString();
      }
      
      const form: ConsentForm = { title, url: href };
      
      // Find the nearest preceding h2 to determine the category.
      // This is more robust than assuming a specific container structure.
      let heading = anchor.closest('div, section, article').prevAll('h2').first();
      if(!heading.length) {
         heading = anchor.prevAll('h2').first();
      }
      if(!heading.length) {
         heading = anchor.parent().prevAll('h2').first();
      }
       if(!heading.length) {
         heading = anchor.closest('main, #main-content').find('h2').first();
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

    updateCache(formCategories);

    return { success: true, formCount: totalForms };
  } catch (error) {
    console.error('Scraping failed:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred during scraping.';
    return { success: false, error: message };
  }
}
