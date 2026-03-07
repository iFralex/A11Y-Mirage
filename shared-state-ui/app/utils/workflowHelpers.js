/**
 * Builds a formatted conversation memory string from workflow steps.
 * Format:
 *   Step N Question: <stateSummary>
 *   Step N Response: <response JSON>
 *
 * @param {Array} steps - Array of step objects from workflow state
 * @returns {string} Formatted conversation history
 */
export function buildConversationMemory(steps) {
  if (!steps || steps.length === 0) return "";

  return steps
    .map((step) => {
      const question = `Step ${step.stepNumber} Question: ${step.stateSummary}`;
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

/**
 * Maps accessibility onboarding workflow step responses to the userProfile schema.
 * Expects steps whose inputs use the canonical IDs defined in the onboarding system context:
 *   sensory_vision, sensory_color, cognitive_maxInputsPerStep,
 *   cognitive_requiresDecisionSupport, cognitive_safeMode,
 *   interaction_preferredModality, interaction_progressiveDisclosure
 *
 * @param {Array} steps - Array of step objects from an accessibility_onboarding workflow
 * @returns {Object} userProfile object matching the store schema
 */
export function mapResponsesToProfile(steps) {
  const allResponses = {};
  for (const step of steps || []) {
    if (step.response && typeof step.response === 'object') {
      Object.assign(allResponses, step.response);
    }
  }

  const get = (key, defaultValue) => {
    const val = allResponses[key];
    return val !== undefined && val !== null ? val : defaultValue;
  };

  const VALID_VISION = ['default', 'screen_reader', 'low_vision'];
  const VALID_COLOR = ['default', 'high_contrast'];
  const VALID_MODALITY = ['visual', 'voice', 'hybrid'];

  const rawVision = get('sensory_vision', 'default');
  const rawColor = get('sensory_color', 'default');
  const rawModality = get('interaction_preferredModality', 'visual');
  const rawMaxInputs = get('cognitive_maxInputsPerStep', null);

  return {
    sensory: {
      vision: VALID_VISION.includes(rawVision) ? rawVision : 'default',
      color: VALID_COLOR.includes(rawColor) ? rawColor : 'default',
    },
    cognitive: {
      maxInputsPerStep: typeof rawMaxInputs === 'number' ? rawMaxInputs : null,
      requiresDecisionSupport: Boolean(get('cognitive_requiresDecisionSupport', false)),
      safeMode: Boolean(get('cognitive_safeMode', false)),
    },
    interaction: {
      preferredModality: VALID_MODALITY.includes(rawModality) ? rawModality : 'visual',
      progressiveDisclosure: Boolean(get('interaction_progressiveDisclosure', false)),
    },
  };
}
