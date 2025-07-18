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

    $('#main-content h2').each((_, h2) => {
      const categoryTitle = $(h2).text().trim();
      const forms: ConsentForm[] = [];
      
      // Find the parent or a container that holds both h2 and the links.
      // Then find all 'a' tags that are likely download links.
      // This is a common pattern for content blocks.
      const contentBlock = $(h2).nextUntil('h2');
      
      contentBlock.find('a').each((_, link) => {
        const anchor = $(link);
        const title = anchor.text().trim();
        let href = anchor.attr('href') || '';
        
        if (title && href && (href.endsWith('.pdf') || href.includes('download'))) {
          if (!href.startsWith('http')) {
            href = new URL(href, config.rcrBaseUrl).toString();
          }
          forms.push({ title, url: href });
        }
      });
      
      // Also check links immediately after the h2, not in a block
      $(h2).find('a').add($(h2).next('p').find('a')).each((_,link) => {
         const anchor = $(link);
         const title = anchor.text().trim();
         let href = anchor.attr('href') || '';
         if (title && href && (href.endsWith('.pdf') || href.includes('download')) && !forms.find(f => f.title === title)) {
            if (!href.startsWith('http')) {
                href = new URL(href, config.rcrBaseUrl).toString();
            }
            forms.push({ title, url: href });
        }
      });
      
      if (forms.length > 0) {
        formCategories.push({ category: categoryTitle, forms });
      }
    });

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
