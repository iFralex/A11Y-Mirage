/**
 * Builds a formatted conversation memory string from workflow steps.
 * Format:
 *   Step N Question: <questionSummary>
 *   Step N Response: <response JSON>
 *
 * @param {Array} steps - Array of step objects from workflow state
 * @returns {string} Formatted conversation history
 */
export function buildConversationMemory(steps) {
  if (!steps || steps.length === 0) return "";

  return steps
    .map((step) => {
      const question = `Step ${step.stepNumber} Question: ${step.questionSummary}`;
      if (step.response) {
        const response = `Step ${step.stepNumber} Response: ${JSON.stringify(step.response)}`;
        return question + "\n" + response;
      }
      return question;
    })
    .join("\n");
}

/**
 * Extracts the user response values from each step.
 *
 * @param {Array} steps - Array of step objects from workflow state
 * @returns {Array} Array of { stepId, stepNumber, response } objects
 */
export function extractStepResults(steps) {
  if (!steps || steps.length === 0) return [];

  return steps
    .filter((step) => step.response !== null && step.response !== undefined)
    .map((step) => ({
      stepId: step.stepId,
      stepNumber: step.stepNumber,
      response: step.response,
    }));
}

/**
 * Returns the step at the given index, or null if out of bounds.
 *
 * @param {Array} steps - Array of step objects from workflow state
 * @param {number} index - Zero-based index
 * @returns {Object|null} The step at that index, or null
 */
export function getCurrentStep(steps, index) {
  if (!steps || index < 0 || index >= steps.length) return null;
  return steps[index];
}
