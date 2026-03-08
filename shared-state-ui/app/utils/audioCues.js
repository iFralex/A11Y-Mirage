/**
 * AudioCues — earcon (non-speech audio feedback) system using the Web Audio API.
 *
 * Each function plays a distinct tone pattern for a specific interface event.
 *
 * Activation rules:
 *   - Only plays when userProfile.interaction.preferredModality === 'voice'
 *     OR userProfile.sensory.vision === 'low_vision'.
 *   - Never plays while window.speechSynthesis is speaking, to avoid overlap.
 */

let _audioContext = null;

/**
 * Lazily create (or reuse) the shared AudioContext.
 * Returns null in SSR environments.
 *
 * @returns {AudioContext|null}
 */
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!_audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    _audioContext = new Ctor();
  }
  return _audioContext;
}

/**
 * Determine whether audio cues should play based on the user's profile.
 *
 * @param {Object} userProfile
 * @returns {boolean}
 */
function shouldPlayCues(userProfile = {}) {
  const modality = userProfile?.interaction?.preferredModality;
  const vision = userProfile?.sensory?.vision;
  return modality === 'voice' || vision === 'low_vision';
}

/**
 * Return true if the Web Speech API is currently speaking.
 *
 * @returns {boolean}
 */
function isSpeaking() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  return window.speechSynthesis.speaking;
}

/**
 * Schedule a sequence of tones on the shared AudioContext.
 *
 * Each note in the sequence is an object:
 *   { freq, dur, gain?, type?, gap? }
 *
 * @param {Array<{freq:number, dur:number, gain?:number, type?:string, gap?:number}>} notes
 * @param {AudioContext} ctx
 */
function scheduleSequenceNow(notes, ctx) {
  let time = ctx.currentTime;
  for (const { freq, dur, gain = 0.3, type = 'sine', gap = 0 } of notes) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(gain, time + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + dur);

    oscillator.start(time);
    oscillator.stop(time + dur + 0.02);

    time += dur + gap;
  }
}

/**
 * Guard-wrapped helper: checks activation rules then schedules the tone sequence.
 *
 * @param {Array} notes
 * @param {Object} userProfile
 */
function playCue(notes, userProfile) {
  if (!shouldPlayCues(userProfile)) return;
  if (isSpeaking()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().then(() => scheduleSequenceNow(notes, ctx)).catch(() => {});
    return;
  }

  scheduleSequenceNow(notes, ctx);
}

// ------------------------------------------------------------------ //
// Public earcon functions                                             //
// ------------------------------------------------------------------ //

/**
 * Play a rising two-tone chime indicating a new workflow step has loaded.
 *
 * @param {Object} [userProfile]
 */
export function playStepChange(userProfile) {
  playCue(
    [
      { freq: 440, dur: 0.12, gain: 0.25, gap: 0.04 },
      { freq: 660, dur: 0.18, gain: 0.25 },
    ],
    userProfile
  );
}

/**
 * Play a three-note ascending chime when a recommended option appears.
 *
 * @param {Object} [userProfile]
 */
export function playSuggestion(userProfile) {
  playCue(
    [
      { freq: 523.25, dur: 0.08, gain: 0.2, gap: 0.03 },
      { freq: 659.25, dur: 0.08, gain: 0.2, gap: 0.03 },
      { freq: 783.99, dur: 0.14, gain: 0.2 },
    ],
    userProfile
  );
}

/**
 * Play a short descending buzz for input validation errors.
 *
 * @param {Object} [userProfile]
 */
export function playError(userProfile) {
  playCue(
    [
      { freq: 300, dur: 0.1, gain: 0.2, type: 'sawtooth', gap: 0.05 },
      { freq: 200, dur: 0.15, gain: 0.2, type: 'sawtooth' },
    ],
    userProfile
  );
}

/**
 * Play a soft, steady tone when Safe Mode is activated.
 *
 * @param {Object} [userProfile]
 */
export function playSafeMode(userProfile) {
  playCue(
    [{ freq: 350, dur: 0.4, gain: 0.15 }],
    userProfile
  );
}

/**
 * Play a brief high-pitched click when the Focus Tunnel is activated.
 *
 * @param {Object} [userProfile]
 */
export function playFocusTunnel(userProfile) {
  playCue(
    [{ freq: 900, dur: 0.06, gain: 0.18 }],
    userProfile
  );
}

/** Convenience namespace grouping all earcon functions. */
export const AudioCues = {
  playStepChange,
  playSuggestion,
  playError,
  playSafeMode,
  playFocusTunnel,
};

export default AudioCues;
