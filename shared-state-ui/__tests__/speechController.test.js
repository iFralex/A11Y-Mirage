import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpeechControllerClass } from '../app/utils/speechController';

// ------------------------------------------------------------------ //
// Helpers                                                              //
// ------------------------------------------------------------------ //

function makeMockSynthesis() {
  return {
    cancel: vi.fn(),
    speak: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  };
}

function makeMockUtteranceClass() {
  const instances = [];
  function MockUtterance(text) {
    this.text = text;
    this.rate = 1;
    this.volume = undefined;
    this.onend = null;
    instances.push(this);
  }
  MockUtterance.instances = instances;
  return MockUtterance;
}

// ------------------------------------------------------------------ //
// Test suite                                                           //
// ------------------------------------------------------------------ //

describe('SpeechControllerClass', () => {
  let controller;
  let mockSynthesis;
  let MockUtterance;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSynthesis = makeMockSynthesis();
    MockUtterance = makeMockUtteranceClass();
    global.window = {
      ...global.window,
      speechSynthesis: mockSynthesis,
      SpeechSynthesisUtterance: MockUtterance,
    };
    controller = new SpeechControllerClass();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------- //
  // speak() — debounce behaviour                                      //
  // ---------------------------------------------------------------- //

  describe('speak()', () => {
    it('does not speak immediately — waits for debounce period', () => {
      controller.speak('Hello');
      expect(mockSynthesis.speak).not.toHaveBeenCalled();
      vi.advanceTimersByTime(300);
      expect(mockSynthesis.speak).toHaveBeenCalledOnce();
    });

    it('debounces rapid consecutive calls — only speaks once', () => {
      controller.speak('First');
      vi.advanceTimersByTime(100);
      controller.speak('Second');
      vi.advanceTimersByTime(100);
      controller.speak('Third');
      vi.advanceTimersByTime(300);
      expect(mockSynthesis.speak).toHaveBeenCalledOnce();
      const utterance = mockSynthesis.speak.mock.calls[0][0];
      expect(utterance.text).toBe('Third');
    });

    it('does nothing when text is empty', () => {
      controller.speak('');
      vi.advanceTimersByTime(300);
      expect(mockSynthesis.speak).not.toHaveBeenCalled();
    });

    it('does nothing when text is null', () => {
      controller.speak(null);
      vi.advanceTimersByTime(300);
      expect(mockSynthesis.speak).not.toHaveBeenCalled();
    });

    it('cancels ongoing speech before speaking', () => {
      controller.speak('New text');
      vi.advanceTimersByTime(300);
      expect(mockSynthesis.cancel).toHaveBeenCalled();
    });

    it('does not throw when speechSynthesis is unavailable', () => {
      global.window.speechSynthesis = undefined;
      controller.speak('Hello');
      expect(() => vi.advanceTimersByTime(300)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------- //
  // Adaptive speech rate                                              //
  // ---------------------------------------------------------------- //

  describe('adaptive speech rate', () => {
    it('uses default rate 1.0 when cognitive load is low', () => {
      controller.speak('Hello', { cognitiveLoadScore: 3 });
      vi.advanceTimersByTime(300);
      const utterance = mockSynthesis.speak.mock.calls[0][0];
      expect(utterance.rate).toBe(1.0);
    });

    it('uses rate 0.85 when cognitive load is between 6 and 8', () => {
      controller.speak('Hello', { cognitiveLoadScore: 7 });
      vi.advanceTimersByTime(300);
      const utterance = mockSynthesis.speak.mock.calls[0][0];
      expect(utterance.rate).toBe(0.85);
    });

    it('uses rate 0.7 when cognitive load exceeds 8', () => {
      controller.speak('Hello', { cognitiveLoadScore: 9 });
      vi.advanceTimersByTime(300);
      const utterance = mockSynthesis.speak.mock.calls[0][0];
      expect(utterance.rate).toBe(0.7);
    });

    it('uses rate 0.7 at exactly load score 9', () => {
      controller.speak('Hello', { cognitiveLoadScore: 9 });
      vi.advanceTimersByTime(300);
      const utterance = mockSynthesis.speak.mock.calls[0][0];
      expect(utterance.rate).toBe(0.7);
    });

    it('uses rate 0.85 at boundary load score 7 (> 6)', () => {
      controller.speak('Hello', { cognitiveLoadScore: 6.1 });
      vi.advanceTimersByTime(300);
      const utterance = mockSynthesis.speak.mock.calls[0][0];
      expect(utterance.rate).toBe(0.85);
    });
  });

  // ---------------------------------------------------------------- //
  // Adaptive volume                                                   //
  // ---------------------------------------------------------------- //

  describe('adaptive volume', () => {
    it('sets volume to 1 when vision is low_vision', () => {
      controller.speak('Hello', {
        userProfile: { sensory: { vision: 'low_vision' } },
      });
      vi.advanceTimersByTime(300);
      const utterance = mockSynthesis.speak.mock.calls[0][0];
      expect(utterance.volume).toBe(1);
    });

    it('does not force volume when vision is default', () => {
      controller.speak('Hello', {
        userProfile: { sensory: { vision: 'default' } },
      });
      vi.advanceTimersByTime(300);
      const utterance = mockSynthesis.speak.mock.calls[0][0];
      expect(utterance.volume).toBeUndefined();
    });

    it('does not force volume when vision is screen_reader', () => {
      controller.speak('Hello', {
        userProfile: { sensory: { vision: 'screen_reader' } },
      });
      vi.advanceTimersByTime(300);
      const utterance = mockSynthesis.speak.mock.calls[0][0];
      expect(utterance.volume).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------- //
  // Safe Mode — pause between sentences                              //
  // ---------------------------------------------------------------- //

  describe('safe mode pause between sentences', () => {
    it('speaks a single utterance when safeMode is false', () => {
      controller.speak('Sentence one. Sentence two.', {
        userProfile: { cognitive: { safeMode: false } },
      });
      vi.advanceTimersByTime(300);
      expect(mockSynthesis.speak).toHaveBeenCalledOnce();
    });

    it('speaks the first sentence immediately when safeMode is true', () => {
      controller.speak('Sentence one. Sentence two.', {
        userProfile: { cognitive: { safeMode: true } },
      });
      vi.advanceTimersByTime(300);
      // First sentence spoken immediately
      expect(mockSynthesis.speak).toHaveBeenCalledOnce();
      const firstUtterance = mockSynthesis.speak.mock.calls[0][0];
      expect(firstUtterance.text).toBe('Sentence one.');
    });

    it('speaks next sentence after 600 ms pause when safeMode is true', () => {
      controller.speak('Sentence one. Sentence two.', {
        userProfile: { cognitive: { safeMode: true } },
      });
      vi.advanceTimersByTime(300); // debounce
      // Trigger onend for first utterance
      const firstUtterance = mockSynthesis.speak.mock.calls[0][0];
      firstUtterance.onend();
      expect(mockSynthesis.speak).toHaveBeenCalledOnce(); // still only first
      vi.advanceTimersByTime(600); // sentence pause
      expect(mockSynthesis.speak).toHaveBeenCalledTimes(2);
      const secondUtterance = mockSynthesis.speak.mock.calls[1][0];
      expect(secondUtterance.text).toBe('Sentence two.');
    });
  });

  // ---------------------------------------------------------------- //
  // cancel()                                                          //
  // ---------------------------------------------------------------- //

  describe('cancel()', () => {
    it('cancels pending debounce so speech never fires', () => {
      controller.speak('Will be cancelled');
      vi.advanceTimersByTime(100);
      controller.cancel();
      vi.advanceTimersByTime(300);
      expect(mockSynthesis.speak).not.toHaveBeenCalled();
    });

    it('calls speechSynthesis.cancel()', () => {
      controller.cancel();
      expect(mockSynthesis.cancel).toHaveBeenCalledOnce();
    });

    it('cancels a pending inter-sentence timer', () => {
      controller.speak('Sentence one. Sentence two.', {
        userProfile: { cognitive: { safeMode: true } },
      });
      vi.advanceTimersByTime(300);
      const firstUtterance = mockSynthesis.speak.mock.calls[0][0];
      firstUtterance.onend(); // starts 600 ms sentence timer
      controller.cancel(); // should clear that timer
      vi.advanceTimersByTime(600);
      // Still only 1 speak call (first sentence only)
      expect(mockSynthesis.speak).toHaveBeenCalledOnce();
    });

    it('does not throw when speechSynthesis is unavailable', () => {
      global.window.speechSynthesis = undefined;
      expect(() => controller.cancel()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------- //
  // pause() and resume()                                              //
  // ---------------------------------------------------------------- //

  describe('pause() and resume()', () => {
    it('pause() delegates to speechSynthesis.pause()', () => {
      controller.pause();
      expect(mockSynthesis.pause).toHaveBeenCalledOnce();
    });

    it('resume() delegates to speechSynthesis.resume()', () => {
      controller.resume();
      expect(mockSynthesis.resume).toHaveBeenCalledOnce();
    });

    it('pause() does not throw when speechSynthesis is unavailable', () => {
      global.window.speechSynthesis = undefined;
      expect(() => controller.pause()).not.toThrow();
    });

    it('resume() does not throw when speechSynthesis is unavailable', () => {
      global.window.speechSynthesis = undefined;
      expect(() => controller.resume()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------- //
  // reread()                                                          //
  // ---------------------------------------------------------------- //

  describe('reread()', () => {
    it('replays the last spoken text immediately (no debounce)', () => {
      controller.speak('Hello world');
      vi.advanceTimersByTime(300); // let debounce fire

      // Now reread — should happen synchronously (no additional timer advance needed)
      controller.reread();
      expect(mockSynthesis.speak).toHaveBeenCalledTimes(2);
    });

    it('does nothing when no text has been spoken yet', () => {
      controller.reread();
      expect(mockSynthesis.speak).not.toHaveBeenCalled();
    });

    it('re-applies updated options during reread', () => {
      controller.speak('Hello');
      vi.advanceTimersByTime(300);

      controller.reread({ cognitiveLoadScore: 9 });
      const utterance = mockSynthesis.speak.mock.calls[1][0];
      expect(utterance.rate).toBe(0.7);
    });
  });

  // ---------------------------------------------------------------- //
  // _computeParams()                                                  //
  // ---------------------------------------------------------------- //

  describe('_computeParams()', () => {
    it('returns default params when called with no arguments', () => {
      const params = controller._computeParams();
      expect(params.rate).toBe(1.0);
      expect(params.volume).toBeUndefined();
      expect(params.pauseBetweenSentences).toBe(0);
    });

    it('combines all adaptive rules simultaneously', () => {
      const params = controller._computeParams(
        { sensory: { vision: 'low_vision' }, cognitive: { safeMode: true } },
        9
      );
      expect(params.rate).toBe(0.7);
      expect(params.volume).toBe(1);
      expect(params.pauseBetweenSentences).toBe(600);
    });
  });
});
