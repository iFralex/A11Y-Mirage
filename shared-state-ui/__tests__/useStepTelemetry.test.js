import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStepTelemetry } from '../app/hooks/useStepTelemetry';
import { useSharedStateStore, defaultTelemetry } from '../app/store/useSharedState';

// ── helpers ──────────────────────────────────────────────────────────────────

function resetStore() {
  useSharedStateStore.setState({
    telemetry: { ...defaultTelemetry },
  });
}

function makeContainerRef(el = document.createElement('div')) {
  return { current: el };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('useStepTelemetry', () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a resetTelemetry function', () => {
    const containerRef = makeContainerRef();
    const { result } = renderHook(() => useStepTelemetry(containerRef));
    expect(typeof result.current.resetTelemetry).toBe('function');
  });

  it('increments focusSwitchesCurrentStep on focusin events', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const containerRef = { current: el };

    renderHook(() => useStepTelemetry(containerRef));

    // Fire three focusin events
    act(() => {
      el.dispatchEvent(new Event('focusin', { bubbles: true }));
      el.dispatchEvent(new Event('focusin', { bubbles: true }));
      el.dispatchEvent(new Event('focusin', { bubbles: true }));
    });

    // Advance timer so the interval fires
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const { telemetry } = useSharedStateStore.getState();
    expect(telemetry.focusSwitchesCurrentStep).toBe(3);

    document.body.removeChild(el);
  });

  it('updates timeOnCurrentStep after the interval fires', () => {
    const containerRef = makeContainerRef();
    renderHook(() => useStepTelemetry(containerRef));

    act(() => {
      vi.advanceTimersByTime(4000); // two ticks
    });

    const { telemetry } = useSharedStateStore.getState();
    // timeOnCurrentStep should be ~4 seconds (rounded)
    expect(telemetry.timeOnCurrentStep).toBeGreaterThanOrEqual(3);
  });

  it('computes localCognitiveLoadScore using the formula', () => {
    const el = document.createElement('div');
    const containerRef = { current: el };

    renderHook(() => useStepTelemetry(containerRef));

    // Simulate 2 focus switches before the interval
    act(() => {
      el.dispatchEvent(new Event('focusin', { bubbles: true }));
      el.dispatchEvent(new Event('focusin', { bubbles: true }));
    });

    // Advance exactly 2 seconds → timeInSeconds ≈ 2
    // score = (2 * 0.1) + (2 * 0.5) + (0 * 2) = 0.2 + 1.0 + 0 = 1.2
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const { telemetry } = useSharedStateStore.getState();
    expect(telemetry.localCognitiveLoadScore).toBeGreaterThan(0);
    expect(telemetry.localCognitiveLoadScore).toBeLessThanOrEqual(10);
  });

  it('caps localCognitiveLoadScore at 10', () => {
    const el = document.createElement('div');
    const containerRef = { current: el };

    renderHook(() => useStepTelemetry(containerRef));

    // Seed high errorCount to force the score over 10
    useSharedStateStore.setState({
      telemetry: { ...defaultTelemetry, errorCount: 100 },
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const { telemetry } = useSharedStateStore.getState();
    expect(telemetry.localCognitiveLoadScore).toBe(10);
  });

  it('includes errorCount from the store in the score calculation', () => {
    const containerRef = makeContainerRef();

    renderHook(() => useStepTelemetry(containerRef));

    // Set errorCount = 2, so at tick: score includes (2 * 2) = 4
    useSharedStateStore.setState({
      telemetry: { ...defaultTelemetry, errorCount: 2 },
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const { telemetry } = useSharedStateStore.getState();
    // score = (time * 0.1) + (0 * 0.5) + (2 * 2) = time_contribution + 4
    expect(telemetry.localCognitiveLoadScore).toBeGreaterThanOrEqual(4);
  });

  it('resetTelemetry resets store telemetry and internal counters', () => {
    const el = document.createElement('div');
    const containerRef = { current: el };
    const { result } = renderHook(() => useStepTelemetry(containerRef));

    // Accumulate some data
    act(() => {
      el.dispatchEvent(new Event('focusin', { bubbles: true }));
      vi.advanceTimersByTime(2000);
    });

    // After reset, store telemetry should be back to defaults
    act(() => {
      result.current.resetTelemetry();
    });

    const { telemetry } = useSharedStateStore.getState();
    expect(telemetry).toEqual(defaultTelemetry);
  });

  it('removes the focusin listener on unmount', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const containerRef = { current: el };

    const { unmount } = renderHook(() => useStepTelemetry(containerRef));

    unmount();

    // Firing focusin after unmount should not update the store
    act(() => {
      el.dispatchEvent(new Event('focusin', { bubbles: true }));
      vi.advanceTimersByTime(2000);
    });

    const { telemetry } = useSharedStateStore.getState();
    // After unmount the interval is also cleared; no updates should happen
    expect(telemetry.focusSwitchesCurrentStep).toBe(0);

    document.body.removeChild(el);
  });

  it('works when containerRef.current is null (graceful no-op)', () => {
    const containerRef = { current: null };
    expect(() => {
      renderHook(() => useStepTelemetry(containerRef));
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }).not.toThrow();
  });
});
