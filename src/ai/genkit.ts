import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({apiKey: 'YOUR_API_KEY_HERE'})],
  model: 'googleai/gemini-2.5-flash',
});
