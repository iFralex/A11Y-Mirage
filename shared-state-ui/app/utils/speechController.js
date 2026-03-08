/**
 * SpeechController — singleton that manages Web Speech API calls with
 * adaptive parameters driven by userProfile and cognitive load telemetry.
 *
 * Rules applied at speak-time:
 *   cognitiveLoad > 6  → speechRate = 0.85
 *   cognitiveLoad > 8  → speechRate = 0.7
 *   safeMode === true  → 600 ms pause between sentences
 *   vision === 'low_vision' → volume = 1 (max)
 *
 * All speak() calls are debounced (300 ms) to prevent repeated narration
 * on rapid state changes.  reread() bypasses the debounce and replays
 * the last spoken text immediately.
 */

export class SpeechControllerClass {
  constructor() {
    this._lastText = null;
    this._debounceTimer = null;
    this._sentenceTimer = null;
    this._debounceDelay = 300;
  }

  // ------------------------------------------------------------------ //
  // Public API                                                           //
  // ------------------------------------------------------------------ //

  /**
   * Schedule speech after a short debounce period.
   * Rapid consecutive calls restart the debounce timer.
   *
   * @param {string} text - Text to speak.
   * @param {Object} options
   * @param {Object} [options.userProfile]           - Full userProfile object.
   * @param {number} [options.cognitiveLoadScore=0]  - Current cognitive load (0–10).
   */
  speak(text, options = {}) {
    if (!text) return;

    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
    }

    this._debounceTimer = setTimeout(() => {
      this._debounceTimer = null;
      this._doSpeak(text, options);
    }, this._debounceDelay);
  }

  /** Pause ongoing speech (delegates to speechSynthesis.pause). */
  pause() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.pause();
  }

  /** Resume paused speech (delegates to speechSynthesis.resume). */
  resume() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.resume();
  }

  /**
   * Cancel any queued debounce, any pending sentence timer, and any
   * currently active utterance.
   */
  cancel() {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    this._clearSentenceTimer();
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
  }

  /**
   * Immediately replay the last spoken text (bypasses debounce).
   *
   * @param {Object} options - Same shape as speak() options.
   */
  reread(options = {}) {
    if (!this._lastText) return;
    this._doSpeak(this._lastText, options);
  }

  // ------------------------------------------------------------------ //
  // Internal helpers                                                     //
  // ------------------------------------------------------------------ //

  /**
   * Compute adaptive utterance parameters from profile and load score.
   *
   * @param {Object} userProfile
   * @param {number} cognitiveLoadScore
   * @returns {{ rate: number, volume: number|undefined, pauseBetweenSentences: number }}
   */
  _computeParams(userProfile = {}, cognitiveLoadScore = 0) {
    const sensory = userProfile.sensory || {};
    const cognitive = userProfile.cognitive || {};

    let rate = 1.0;
    if (cognitiveLoadScore > 8) {
      rate = 0.7;
    } else if (cognitiveLoadScore > 6) {
      rate = 0.85;
    }

    const volume = sensory.vision === 'low_vision' ? 1 : undefined;
    const pauseBetweenSentences = cognitive.safeMode === true ? 600 : 0;

    return { rate, volume, pauseBetweenSentences };
  }

  /**
   * Immediately speak text with adaptive parameters.
   * Cancels any current utterance and sentence timers first.
   *
   * @param {string} text
   * @param {Object} options
   */
  _doSpeak(text, options = {}) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const { userProfile, cognitiveLoadScore = 0 } = options;
    const { rate, volume, pauseBetweenSentences } = this._computeParams(
      userProfile,
      cognitiveLoadScore
    );

    this._lastText = text;
    this._clearSentenceTimer();
    window.speechSynthesis.cancel();

    if (pauseBetweenSentences > 0) {
      // Split on sentence boundaries and insert 600 ms pauses between them.
      const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
      this._speakSentences(sentences, 0, rate, volume, pauseBetweenSentences);
    } else {
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      if (volume !== undefined) utterance.volume = volume;
      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * Recursively speak sentences one-by-one with a pause between each.
   *
   * @param {string[]} sentences
   * @param {number}   index
   * @param {number}   rate
   * @param {number|undefined} volume
   * @param {number}   pause  Milliseconds to wait between sentences.
   */
  _speakSentences(sentences, index, rate, volume, pause) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (index >= sentences.length) return;

    const sentence = sentences[index].trim();
    if (!sentence) {
      this._speakSentences(sentences, index + 1, rate, volume, pause);
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance(sentence);
    utterance.rate = rate;
    if (volume !== undefined) utterance.volume = volume;

    utterance.onend = () => {
      if (index < sentences.length - 1) {
        this._sentenceTimer = setTimeout(() => {
          this._sentenceTimer = null;
          this._speakSentences(sentences, index + 1, rate, volume, pause);
        }, pause);
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Register global event listeners (keydown, mousedown, focusin) that
   * automatically cancel speech whenever the user interacts with the page.
   * Returns a cleanup function that removes the listeners.
   *
   * Centralises cancellation logic so components don't need to wire up their
   * own event handlers for this purpose.
   *
   * @returns {() => void} Cleanup function to remove the listeners.
   */
  registerInteractionCancellation() {
    const handler = () => this.cancel();
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('keydown', handler);
    window.addEventListener('mousedown', handler);
    window.addEventListener('focusin', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('focusin', handler);
    };
  }

  /** Clear any pending inter-sentence pause timer. */
  _clearSentenceTimer() {
    if (this._sentenceTimer !== null) {
      clearTimeout(this._sentenceTimer);
      this._sentenceTimer = null;
    }
  }
}

/** Application-wide singleton. */
export const SpeechController = new SpeechControllerClass();
export default SpeechController;
