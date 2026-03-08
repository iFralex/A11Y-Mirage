'use client';

import { useKeyboardAccessibility } from '@/app/hooks/useKeyboardAccessibility';

/**
 * Thin client component that mounts the global keyboard accessibility
 * shortcuts. Renders nothing visible; its only purpose is to host the
 * hook in the component tree so it runs on the client side even when
 * the parent (root layout) is a server component.
 */
export default function GlobalKeyboardAccessibility() {
  useKeyboardAccessibility();
  return null;
}
