'use server';

/**
 * @fileOverview A flow for suggesting relevant target proteins based on a disease or target keyword.
 *
 * - suggestTargetProteins - A function that suggests target proteins based on a keyword.
 * - SuggestTargetProteinsInput - The input type for the suggestTargetProteins function.
 * - SuggestTargetProteinsOutput - The return type for the suggestTargetProteins function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTargetProteinsInputSchema = z.object({
  keyword: z
    .string()
    .describe('A disease or target keyword to find relevant proteins.'),
});
export type SuggestTargetProteinsInput = z.infer<
  typeof SuggestTargetProteinsInputSchema
>;

const SuggestTargetProteinsOutputSchema = z.object({
  proteins: z
    .array(z.string())
    .describe('An array of relevant protein names or identifiers.'),
});
export type SuggestTargetProteinsOutput = z.infer<
  typeof SuggestTargetProteinsOutputSchema
>;

export async function suggestTargetProteins(
  input: SuggestTargetProteinsInput
): Promise<SuggestTargetProteinsOutput> {
  return suggestTargetProteinsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTargetProteinsPrompt',
  input: {schema: SuggestTargetProteinsInputSchema},
  output: {schema: SuggestTargetProteinsOutputSchema},
  prompt: `You are an AI assistant specialized in drug discovery.
  Based on the provided keyword, suggest a list of relevant target proteins.
  Return the proteins as a JSON array of strings.
  Keyword: {{{keyword}}}`,
});

const suggestTargetProteinsFlow = ai.defineFlow(
  {
    name: 'suggestTargetProteinsFlow',
    inputSchema: SuggestTargetProteinsInputSchema,
    outputSchema: SuggestTargetProteinsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
