'use server';
/**
 * @fileOverview A flow for scraping RCR consent forms from their website.
 *
 * - scrapeRcrForms - Scrapes the RCR website for consent form links.
 * - ScrapeRcrFormsOutput - The return type for the scrapeRcrForms function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { ConsentForm, ConsentFormCategory } from '@/lib/types';
import { updateCache } from '@/ai/util/cache';
import config from '@/config/app.json';

const ScrapeRcrFormsOutputSchema = z.object({
    success: z.boolean(),
    formCount: z.number().optional(),
    error: z.string().optional(),
});
export type ScrapeRcrFormsOutput = z.infer<typeof ScrapeRcrFormsOutputSchema>;

const ScrapedDataSchema = z.array(
  z.object({
    category: z.string().describe('The clinical area or category for the group of forms.'),
    forms: z.array(
      z.object({
        title: z.string().describe('The title of the consent form.'),
        url: z.string().describe('The full URL to the consent form PDF.'),
      })
    ),
  })
);

export async function scrapeRcrForms(url: string): Promise<ScrapeRcrFormsOutput> {
  return scrapeRcrFormsFlow(url);
}

const scrapeRcrFormsFlow = ai.defineFlow(
  {
    name: 'scrapeRcrFormsFlow',
    inputSchema: z.string(),
    outputSchema: ScrapeRcrFormsOutputSchema,
  },
  async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch the page. Status: ${response.status}`);
      }
      const html = await response.text();
      const $ = cheerio.load(html);

      // Reduce HTML to only the main content to save tokens
      const mainContent = $('#main-content').html();
      if (!mainContent) {
        throw new Error("Could not find the main content area of the page.");
      }

      const prompt = ai.definePrompt({
        name: 'rcrScraperPrompt',
        input: { schema: z.string() },
        output: { schema: ScrapedDataSchema },
        prompt: `You are an expert at parsing HTML to extract structured data.
          Given the following HTML from the RCR National Radiotherapy Consent Forms page,
          extract all the consent form categories and the forms within each category.
          Each form has a title and a direct link to a PDF.
          The links are in 'a' tags with the class 'download-link'.
          The title is the text of the link. The URL is the href attribute.
          The category is the text of the 'h2' heading preceding each group of forms.
          Construct the full URL for each form by prepending "${config.rcrBaseUrl}" to the href attribute if it's a relative path.

          HTML:
          \`\`\`html
          {{{input}}}
          \`\`\`
          `,
      });
      
      const { output } = await prompt(mainContent);

      if (!output) {
        throw new Error('AI model failed to extract form data.');
      }

      const formCategories: ConsentFormCategory[] = output;
      const totalForms = formCategories.reduce((sum, cat) => sum + cat.forms.length, 0);

      if (totalForms === 0) {
        throw new Error("No forms were extracted. The page structure may have changed.");
      }

      // Update the server-side cache with the new data
      updateCache(formCategories);

      return { success: true, formCount: totalForms };
    } catch (error) {
      console.error("Scraping failed:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred during scraping.";
      return { success: false, error: message };
    }
  }
);
