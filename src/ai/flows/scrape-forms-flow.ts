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

    const formCategories: ConsentFormCategory[] = [];
    let currentCategory: string | null = null;
    let currentForms: ConsentForm[] = [];

    $('#main-content').children().each((_, el) => {
      const element = $(el);
      if (element.is('h2')) {
        if (currentCategory && currentForms.length) {
          formCategories.push({ category: currentCategory, forms: currentForms });
        }
        currentCategory = element.text().trim();
        currentForms = [];
      }

      element.find('a.download-link').each((_, link) => {
        const anchor = $(link);
        const title = anchor.text().trim();
        let href = anchor.attr('href') || '';
        if (!href.startsWith('http')) {
          href = `${config.rcrBaseUrl}${href}`;
        }
        currentForms.push({ title, url: href });
      });
    });

    if (currentCategory && currentForms.length) {
      formCategories.push({ category: currentCategory, forms: currentForms });
    }

    const totalForms = formCategories.reduce((sum, cat) => sum + cat.forms.length, 0);

    if (totalForms === 0) {
      throw new Error('No forms were extracted. The page structure may have changed.');
    }

    updateCache(formCategories);

    return { success: true, formCount: totalForms };
  } catch (error) {
    console.error('Scraping failed:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred during scraping.';
    return { success: false, error: message };
  }
}
