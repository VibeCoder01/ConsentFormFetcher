import { NextResponse } from 'next/server';
import { getCachedForms } from '@/ai/util/cache';
import path from 'path';
import fs from 'fs/promises';
import { ConsentFormCategory } from '@/lib/types';

export async function GET() {
  // Try to get data from cache first
  const cachedData = getCachedForms();
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  // If cache is empty, fall back to the static JSON file
  try {
    const jsonFilePath = path.join(process.cwd(), 'public', 'consent-forms.json');
    const jsonData = await fs.readFile(jsonFilePath, 'utf-8');
    const data: ConsentFormCategory[] = JSON.parse(jsonData);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to read static consent forms file:", error);
    return NextResponse.json({ message: "Could not load consent forms." }, { status: 500 });
  }
}
