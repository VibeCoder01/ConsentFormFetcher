import fs from 'fs/promises';
import path from 'path';

export interface AppConfig {
  rcrConsentFormsUrl: string;
  rcrBaseUrl: string;
  validateRNumber: boolean;
  previewPdfFields: boolean;
  pdfOpenMethod: 'browser' | 'acrobat';
  rtConsentFolder: string;
  prepopulateWithFakeData: boolean;
  showWelshForms: boolean;
  komsApiDebugMode: boolean;
}

export const defaultAppConfig: AppConfig = {
  rcrConsentFormsUrl: 'https://www.rcr.ac.uk/our-services/management-service-delivery/national-radiotherapy-consent-forms/',
  rcrBaseUrl: 'https://www.rcr.ac.uk',
  validateRNumber: false,
  previewPdfFields: false,
  pdfOpenMethod: 'browser',
  rtConsentFolder: '',
  prepopulateWithFakeData: true,
  showWelshForms: false,
  komsApiDebugMode: false,
};

export const appConfigPath = path.join(process.cwd(), 'src', 'config', 'app.json');
export const appConfigExamplePath = path.join(process.cwd(), 'src', 'config', 'app.example.json');

async function readConfigFile(filePath: string): Promise<Partial<AppConfig>> {
  const jsonData = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(jsonData) as Partial<AppConfig>;
}

export async function readAppConfig(): Promise<AppConfig> {
  try {
    return {
      ...defaultAppConfig,
      ...(await readConfigFile(appConfigPath)),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  try {
    return {
      ...defaultAppConfig,
      ...(await readConfigFile(appConfigExamplePath)),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return defaultAppConfig;
}

export async function writeAppConfig(config: AppConfig): Promise<void> {
  await fs.writeFile(appConfigPath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function updateAppConfig(updates: Partial<AppConfig>): Promise<AppConfig> {
  const currentConfig = await readAppConfig();
  const updatedConfig: AppConfig = {
    ...currentConfig,
    ...updates,
  };

  await writeAppConfig(updatedConfig);
  return updatedConfig;
}
