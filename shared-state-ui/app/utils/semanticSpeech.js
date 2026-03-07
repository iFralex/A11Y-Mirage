/**
 * Generates a conversational semantic summary string for speech synthesis.
 * Ignores raw UI labels and instead builds a human-readable spoken summary.
 *
 * @param {Object} stepData - The current step object from the workflow
 * @returns {string} A conversational string suitable for speech synthesis
 */
export function generateSemanticSummary(stepData) {
  if (!stepData) return '';

  const { stepNumber, stateSummary, inputs = [], recommendedOptionId, decisionExplanation } = stepData;

  const inputLabels = inputs.map((i) => i.label).filter(Boolean);

  const trimmedSummary = stateSummary ? stateSummary.replace(/\.?\s*$/, '') : '';
  let summary = `Step ${stepNumber}. ${trimmedSummary}.`;

  if (inputLabels.length > 0) {
    summary += ` We need to know: ${inputLabels.join(', ')}.`;
  }

  if (recommendedOptionId) {
    const recommendedInput = inputs.find((i) => i.id === recommendedOptionId);
    const recommendedLabel = recommendedInput ? recommendedInput.label : recommendedOptionId;

    if (decisionExplanation) {
      summary += `I recommend ${recommendedLabel} because ${decisionExplanation}.`;
    } else {
      summary += `I recommend ${recommendedLabel}.`;
    }
  }

  return summary.trim();
}

/**
 * Speaks the given text using the Web Speech API.
 * Cancels any ongoing speech before starting.
 *
 * @param {string} text - The text to speak
 */
export function speakText(text) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new window.SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}

/**
 * Cancels any currently speaking speech synthesis utterance.
 */
export function cancelSpeech() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
