/**
 * Generates a conversational semantic summary string for speech synthesis.
 * Ignores raw UI labels and instead builds a human-readable spoken summary.
 * Adapts the narration depth based on the current cognitive load score.
 *
 * Narration levels:
 *   - Low load  (score < 4):  Short summary — step number and state summary only.
 *   - Medium load (4–7):      Normal explanation — current behaviour (inputs listed, recommendation appended).
 *   - High load (score > 7):  Guided narration — options read one by one, recommended option highlighted,
 *                             simplified sentence structure.
 *
 * @param {Object} stepData       - The current step object from the workflow.
 * @param {number} [cognitiveLoad=0] - The current local cognitive load score (0–10).
 * @returns {string} A conversational string suitable for the SpeechController.
 */
export function generateSemanticSummary(stepData, cognitiveLoad = 5) {
  if (!stepData) return '';

  const { stepNumber, stateSummary, inputs = [], recommendedOptionId, decisionExplanation } = stepData;

  const trimmedSummary = stateSummary ? stateSummary.replace(/\.?\s*$/, '') : '';
  const intro = `Step ${stepNumber}. ${trimmedSummary}.`;

  // ── Low load: short summary only ────────────────────────────────────────────
  if (cognitiveLoad < 4) {
    return intro.trim();
  }

  // ── High load: guided narration ─────────────────────────────────────────────
  if (cognitiveLoad > 7) {
    let guided = intro;

    const labelledInputs = inputs.filter((i) => i.label);
    if (labelledInputs.length > 0) {
      guided += ' I will guide you through each option.';
      labelledInputs.forEach((input, idx) => {
        const isRecommended = input.id === recommendedOptionId;
        guided += ` Option ${idx + 1}: ${input.label}${isRecommended ? ', recommended' : ''}.`;
      });
    }

    if (recommendedOptionId) {
      const recommendedInput = inputs.find((i) => i.id === recommendedOptionId);
      const recommendedLabel = recommendedInput ? recommendedInput.label : recommendedOptionId;
      if (decisionExplanation) {
        guided += ` I suggest ${recommendedLabel}. ${decisionExplanation}.`;
      } else {
        guided += ` I suggest ${recommendedLabel}.`;
      }
    }

    return guided.trim();
  }

  // ── Medium load: normal explanation (original behaviour) ────────────────────
  const inputLabels = inputs.map((i) => i.label).filter(Boolean);
  let summary = intro;

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
