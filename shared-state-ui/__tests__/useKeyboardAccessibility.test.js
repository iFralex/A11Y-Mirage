import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardAccessibility } from '../app/hooks/useKeyboardAccessibility';
import { useSharedStateStore, defaultUserProfile, defaultTelemetry } from '../app/store/useSharedState';

// ── mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../app/utils/speechController', () => {
  const controller = {
    reread: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
    speak: vi.fn(),
  };
  return { default: controller, SpeechController: controller };
});

// ── helpers ───────────────────────────────────────────────────────────────────

function resetStore() {
  useSharedStateStore.setState({
    userProfile: { ...defaultUserProfile },
    telemetry: { ...defaultTelemetry },
    currentStepIndex: 1,
  });
}

function fireAlt(key) {
  const event = new KeyboardEvent('keydown', {
    key,
    altKey: true,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event;
}

function fireAltPrevented(key) {
  const event = new KeyboardEvent('keydown', {
    key,
    altKey: true,
    bubbles: true,
    cancelable: true,
  });
  // Simulate another handler already consuming it.
  event.preventDefault();
  window.dispatchEvent(event);
  return event;
}

function fireNoAlt(key) {
  const event = new KeyboardEvent('keydown', {
    key,
    altKey: false,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('useKeyboardAccessibility', () => {
  let SpeechController;
  let goToPreviousStep;

  beforeEach(async () => {
    resetStore();
    const mod = await import('../app/utils/speechController');
    SpeechController = mod.default;
    vi.clearAllMocks();

    // Spy on store's goToPreviousStep.
    goToPreviousStep = vi.fn();
    useSharedStateStore.setState({ goToPreviousStep });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers and cleans up a keydown listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useKeyboardAccessibility());

    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('Alt+R calls SpeechController.reread', () => {
    renderHook(() => useKeyboardAccessibility());
    act(() => { fireAlt('r'); });
    expect(SpeechController.reread).toHaveBeenCalledTimes(1);
  });

  it('Alt+P calls SpeechController.pause', () => {
    renderHook(() => useKeyboardAccessibility());
    act(() => { fireAlt('p'); });
    expect(SpeechController.pause).toHaveBeenCalledTimes(1);
  });

  it('Alt+C calls SpeechController.resume', () => {
    renderHook(() => useKeyboardAccessibility());
    act(() => { fireAlt('c'); });
    expect(SpeechController.resume).toHaveBeenCalledTimes(1);
  });

  it('Alt+S calls SpeechController.cancel', () => {
    renderHook(() => useKeyboardAccessibility());
    act(() => { fireAlt('s'); });
    expect(SpeechController.cancel).toHaveBeenCalledTimes(1);
  });

  it('Alt+F focuses [data-recommended="true"] element', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-recommended', 'true');
    btn.scrollIntoView = vi.fn();
    document.body.appendChild(btn);
    const focusSpy = vi.spyOn(btn, 'focus');

    renderHook(() => useKeyboardAccessibility());
    act(() => { fireAlt('f'); });

    expect(focusSpy).toHaveBeenCalledTimes(1);
    document.body.removeChild(btn);
  });

  it('Alt+F does nothing when no recommended element exists', () => {
    // No element with data-recommended in DOM.
    renderHook(() => useKeyboardAccessibility());
    // Should not throw.
    expect(() => act(() => { fireAlt('f'); })).not.toThrow();
  });

  it('Alt+N clicks [data-action="submit-step"] element', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'submit-step');
    btn.disabled = false;
    const clickSpy = vi.spyOn(btn, 'click');
    document.body.appendChild(btn);

    renderHook(() => useKeyboardAccessibility());
    act(() => { fireAlt('n'); });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    document.body.removeChild(btn);
  });

  it('Alt+N does not click a disabled submit button', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-action', 'submit-step');
    btn.disabled = true;
    const clickSpy = vi.spyOn(btn, 'click');
    document.body.appendChild(btn);

    renderHook(() => useKeyboardAccessibility());
    act(() => { fireAlt('n'); });

    expect(clickSpy).not.toHaveBeenCalled();
    document.body.removeChild(btn);
  });

  it('Alt+B calls goToPreviousStep from the store', () => {
    renderHook(() => useKeyboardAccessibility());
    act(() => { fireAlt('b'); });
    expect(goToPreviousStep).toHaveBeenCalledTimes(1);
  });

  it('Alt+H clicks [data-action="open-help"] when present', () => {
    const helpBtn = document.createElement('button');
    helpBtn.setAttribute('data-action', 'open-help');
    const clickSpy = vi.spyOn(helpBtn, 'click');
    document.body.appendChild(helpBtn);

    renderHook(() => useKeyboardAccessibility());
    act(() => { fireAlt('h'); });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    document.body.removeChild(helpBtn);
  });

  it('Alt+H speaks help text when no open-help button exists', () => {
    renderHook(() => useKeyboardAccessibility());
    act(() => { fireAlt('h'); });
    expect(SpeechController.speak).toHaveBeenCalledTimes(1);
    expect(SpeechController.speak.mock.calls[0][0]).toMatch(/keyboard shortcuts/i);
  });

  it('ignores events without Alt key', () => {
    renderHook(() => useKeyboardAccessibility());
    act(() => { fireNoAlt('r'); });
    expect(SpeechController.reread).not.toHaveBeenCalled();
  });

  it('ignores events already consumed by another handler', () => {
    renderHook(() => useKeyboardAccessibility());
    act(() => { fireAltPrevented('r'); });
    expect(SpeechController.reread).not.toHaveBeenCalled();
  });

  it('ignores unknown Alt+key combinations without side-effects', () => {
    renderHook(() => useKeyboardAccessibility());
    expect(() => act(() => { fireAlt('z'); })).not.toThrow();
    expect(SpeechController.speak).not.toHaveBeenCalled();
    expect(SpeechController.cancel).not.toHaveBeenCalled();
  });

  it('Alt+R passes userProfile and cognitiveLoadScore to reread', () => {
    useSharedStateStore.setState({
      userProfile: { ...defaultUserProfile, sensory: { vision: 'low_vision', color: 'default' } },
      telemetry: { ...defaultTelemetry, localCognitiveLoadScore: 8 },
    });
    renderHook(() => useKeyboardAccessibility());
    act(() => { fireAlt('r'); });
    const callArg = SpeechController.reread.mock.calls[0][0];
    expect(callArg.cognitiveLoadScore).toBe(8);
    expect(callArg.userProfile.sensory.vision).toBe('low_vision');
  });
});
