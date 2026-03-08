import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSemanticSummary, speakText, cancelSpeech } from '../app/utils/semanticSpeech';

describe('generateSemanticSummary', () => {
  it('returns empty string for null stepData', () => {
    expect(generateSemanticSummary(null)).toBe('');
  });

  it('returns empty string for undefined stepData', () => {
    expect(generateSemanticSummary(undefined)).toBe('');
  });

  it('builds a basic summary with step number and state summary', () => {
    const step = {
      stepNumber: 1,
      stateSummary: 'Gathering trip details.',
      inputs: [],
    };
    const result = generateSemanticSummary(step);
    expect(result).toContain('Step 1');
    expect(result).toContain('Gathering trip details');
    // Should not have double periods
    expect(result).not.toContain('..');
  });

  it('includes input labels in the summary', () => {
    const step = {
      stepNumber: 2,
      stateSummary: 'Choosing destinations.',
      inputs: [
        { id: 'dest', label: 'Destination' },
        { id: 'date', label: 'Travel date' },
      ],
    };
    const result = generateSemanticSummary(step);
    expect(result).toContain('We need to know: Destination, Travel date');
  });

  it('skips inputs without labels', () => {
    const step = {
      stepNumber: 1,
      stateSummary: 'Filling details.',
      inputs: [
        { id: 'a', label: 'Name' },
        { id: 'b', label: '' },
        { id: 'c' },
      ],
    };
    const result = generateSemanticSummary(step);
    expect(result).toContain('We need to know: Name');
    expect(result).not.toContain(',,');
  });

  it('appends recommendation with explanation when recommendedOptionId and decisionExplanation are set', () => {
    const step = {
      stepNumber: 3,
      stateSummary: 'Selecting cabin class.',
      inputs: [
        { id: 'economy', label: 'Economy' },
        { id: 'business', label: 'Business' },
      ],
      recommendedOptionId: 'economy',
      decisionExplanation: 'it offers the best value for short flights',
    };
    const result = generateSemanticSummary(step);
    expect(result).toContain('I recommend Economy because it offers the best value for short flights.');
  });

  it('appends recommendation without explanation when only recommendedOptionId is set', () => {
    const step = {
      stepNumber: 3,
      stateSummary: 'Selecting cabin class.',
      inputs: [{ id: 'economy', label: 'Economy' }],
      recommendedOptionId: 'economy',
    };
    const result = generateSemanticSummary(step);
    expect(result).toContain('I recommend Economy.');
    expect(result).not.toContain('because');
  });

  it('falls back to recommendedOptionId as label when no matching input found', () => {
    const step = {
      stepNumber: 1,
      stateSummary: 'Making a choice.',
      inputs: [],
      recommendedOptionId: 'option-x',
      decisionExplanation: 'it is the best choice',
    };
    const result = generateSemanticSummary(step);
    expect(result).toContain('I recommend option-x because it is the best choice.');
  });

  it('does not include recommendation section when recommendedOptionId is missing', () => {
    const step = {
      stepNumber: 1,
      stateSummary: 'Just a step.',
      inputs: [{ id: 'q', label: 'Question' }],
    };
    const result = generateSemanticSummary(step);
    expect(result).not.toContain('I recommend');
  });

  it('handles missing inputs array gracefully', () => {
    const step = {
      stepNumber: 1,
      stateSummary: 'A step with no inputs key.',
    };
    const result = generateSemanticSummary(step);
    expect(result).toContain('Step 1');
    expect(result).toContain('A step with no inputs key');
    expect(result).not.toContain('..');
  });
});

describe('generateSemanticSummary — adaptive narration levels', () => {
  const baseStep = {
    stepNumber: 2,
    stateSummary: 'Selecting your cabin class.',
    inputs: [
      { id: 'economy', label: 'Economy' },
      { id: 'business', label: 'Business' },
      { id: 'first', label: 'First Class' },
    ],
    recommendedOptionId: 'economy',
    decisionExplanation: 'it offers the best value for short flights',
  };

  describe('low load (cognitiveLoad < 4)', () => {
    it('returns only the step intro — no input list', () => {
      const result = generateSemanticSummary(baseStep, 0);
      expect(result).toContain('Step 2');
      expect(result).toContain('Selecting your cabin class');
      expect(result).not.toContain('We need to know');
    });

    it('does not include the recommendation', () => {
      const result = generateSemanticSummary(baseStep, 3);
      expect(result).not.toContain('I recommend');
    });

    it('produces a short single-sentence output', () => {
      const result = generateSemanticSummary(baseStep, 1);
      // Should end after the intro period — no Option or guided text
      expect(result).not.toContain('Option');
      expect(result).not.toContain('I will guide');
    });
  });

  describe('medium load (cognitiveLoad 4–7)', () => {
    it('lists input labels as normal', () => {
      const result = generateSemanticSummary(baseStep, 5);
      expect(result).toContain('We need to know: Economy, Business, First Class');
    });

    it('includes the recommendation with explanation', () => {
      const result = generateSemanticSummary(baseStep, 6);
      expect(result).toContain('I recommend Economy because it offers the best value for short flights.');
    });

    it('does not use guided narration phrasing', () => {
      const result = generateSemanticSummary(baseStep, 4);
      expect(result).not.toContain('I will guide');
      expect(result).not.toContain('Option 1:');
    });
  });

  describe('high load (cognitiveLoad > 7)', () => {
    it('uses guided narration phrasing', () => {
      const result = generateSemanticSummary(baseStep, 8);
      expect(result).toContain('I will guide you through each option');
    });

    it('reads options one by one with ordinal labels', () => {
      const result = generateSemanticSummary(baseStep, 9);
      expect(result).toContain('Option 1: Economy');
      expect(result).toContain('Option 2: Business');
      expect(result).toContain('Option 3: First Class');
    });

    it('marks the recommended option inline', () => {
      const result = generateSemanticSummary(baseStep, 10);
      expect(result).toContain('Option 1: Economy, recommended');
    });

    it('appends simplified recommendation sentence with "I suggest" phrasing', () => {
      const result = generateSemanticSummary(baseStep, 9);
      expect(result).toContain('I suggest Economy');
      expect(result).toContain('it offers the best value for short flights');
    });

    it('handles missing explanation in high load gracefully', () => {
      const step = { ...baseStep, decisionExplanation: undefined };
      const result = generateSemanticSummary(step, 9);
      expect(result).toContain('I suggest Economy.');
      expect(result).not.toContain('undefined');
    });

    it('does not use "We need to know" phrasing', () => {
      const result = generateSemanticSummary(baseStep, 8);
      expect(result).not.toContain('We need to know');
    });

    it('works with no recommendedOptionId', () => {
      const step = { ...baseStep, recommendedOptionId: undefined };
      const result = generateSemanticSummary(step, 9);
      expect(result).toContain('Option 1: Economy.');
      expect(result).not.toContain('recommended');
      expect(result).not.toContain('I suggest');
    });
  });

  describe('boundary values', () => {
    it('score exactly 4 uses medium narration', () => {
      const result = generateSemanticSummary(baseStep, 4);
      expect(result).toContain('We need to know');
    });

    it('score exactly 7 uses medium narration', () => {
      const result = generateSemanticSummary(baseStep, 7);
      expect(result).toContain('We need to know');
      expect(result).not.toContain('I will guide');
    });

    it('score of 7.5 uses high narration', () => {
      const result = generateSemanticSummary(baseStep, 7.5);
      expect(result).toContain('I will guide');
    });
  });
});

describe('speakText', () => {
  let mockCancel;
  let mockSpeak;

  beforeEach(() => {
    mockCancel = vi.fn();
    mockSpeak = vi.fn();
    function MockUtterance(text) { this.text = text; }
    global.window.speechSynthesis = { cancel: mockCancel, speak: mockSpeak };
    global.window.SpeechSynthesisUtterance = MockUtterance;
  });

  it('cancels any existing speech before speaking', () => {
    speakText('Hello world');
    expect(mockCancel).toHaveBeenCalledOnce();
    expect(mockSpeak).toHaveBeenCalledOnce();
  });

  it('creates an utterance with the given text and speaks it', () => {
    speakText('Test message');
    expect(mockSpeak).toHaveBeenCalledOnce();
    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.text).toBe('Test message');
  });

  it('does nothing when text is empty', () => {
    speakText('');
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('does nothing when text is null', () => {
    speakText(null);
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('does nothing when speechSynthesis is unavailable', () => {
    global.window.speechSynthesis = undefined;
    expect(() => speakText('Hello')).not.toThrow();
  });
});

describe('cancelSpeech', () => {
  it('calls speechSynthesis.cancel()', () => {
    const mockCancel = vi.fn();
    global.window = { ...global.window, speechSynthesis: { cancel: mockCancel } };
    cancelSpeech();
    expect(mockCancel).toHaveBeenCalledOnce();
  });

  it('does nothing when speechSynthesis is unavailable', () => {
    global.window.speechSynthesis = undefined;
    expect(() => cancelSpeech()).not.toThrow();
  });
});
