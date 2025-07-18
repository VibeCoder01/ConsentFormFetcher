'use server';

import {genkit} from 'genkit';
import {googleAI} from 'google-ai';
import {firebase} from '@genkit-ai/firebase';
import {googleCloud} from '@genkit-ai/google-cloud';

const PROJECT_ID = process.env.PROJECT_ID || 'test-project';
const LOCATION = process.env.LOCATION || 'us-central1';

export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(),
    googleCloud({
      projectId: PROJECT_ID,
      location: LOCATION,
    }),
  ],
  flowStateStore: 'firebase',
  traceStore: 'firebase',
  enableTracing: true,
});
