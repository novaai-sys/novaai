/** Preset tones. `tone_of_voice` stores the preset name, or free text. */
export const tonePresets = {
  Warm: {
    instruction: "Warm, friendly and personal, like a shop owner who knows their regulars.",
    sample:
      "Thank you so much, Maria! The pistachio croissant is our baker's pride, so this made his morning. Can't wait to see you again.",
  },
  Formal: {
    instruction: "Polite, professional and measured. No slang, no exclamation marks.",
    sample:
      "Thank you for your kind review, Maria. We are pleased that you enjoyed the pistachio croissant and appreciated our team. We look forward to welcoming you again.",
  },
  Short: {
    instruction: "Very brief: two sentences at most. Friendly and direct.",
    sample: "Thanks, Maria! Glad you loved the croissant. See you soon.",
  },
  Playful: {
    instruction: "Light and playful with gentle humour, never sarcastic, never at the customer's expense.",
    sample:
      "Maria, you've just made our baker insufferable for the rest of the week. The pistachio croissants will be waiting. Come back soon!",
  },
} as const;

export type TonePreset = keyof typeof tonePresets;

export const isPreset = (tone: string): tone is TonePreset => tone in tonePresets;

/** The sentence given to the model for a stored tone value. */
export function toneInstruction(tone: string) {
  const clean = tone.trim();
  if (!clean) return tonePresets.Warm.instruction;
  return isPreset(clean) ? tonePresets[clean].instruction : clean;
}
