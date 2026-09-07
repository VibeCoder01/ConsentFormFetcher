import path from 'node:path';
export const configDirectory = process.env.CONFIG_DIR || path.join(process.cwd(), 'src', 'config');
export const formsFile = process.env.CONFIG_DIR
  ? path.join(configDirectory, 'consent-forms.json')
  : path.join(process.cwd(), 'public', 'consent-forms.json');
