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
