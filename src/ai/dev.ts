import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-target-proteins.ts';
import '@/ai/flows/predict-binding-affinities.ts';
