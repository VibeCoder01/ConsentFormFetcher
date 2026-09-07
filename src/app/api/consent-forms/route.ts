import { feedback } from '@/lib/diagnostics';
import { api } from '@/lib/authorization';
import { NextResponse } from 'next/server';
import { getCachedForms } from '@/ai/util/cache';
import { formsFile } from '@/lib/config-path';
import fs from 'fs/promises';
import { ConsentFormCategory } from '@/lib/types';

async function handleGET() {
  // Try to get data from cache first
  const cachedData = getCachedForms();
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  // If cache is empty, fall back to the static JSON file
  try {
    const jsonFilePath = formsFile;
    const jsonData = await fs.readFile(jsonFilePath, 'utf-8');
    const data: ConsentFormCategory[] = JSON.parse(jsonData);
    return NextResponse.json(data);
  } catch (error) {
    await feedback('failed', { error });
    return NextResponse.json({ message: "Could not load consent forms." }, { status: 500 });
  }
}

export const GET = api('consent-forms', 'read', handleGET, false);
