'use client';

import { useSharedStateStore } from '@/app/store/useSharedState';

const SPACING_CLASSES = {
  relaxed: 'space-y-8',
  compact: 'space-y-2',
  standard: 'space-y-4',
};

export default function AdaptiveLayoutProvider({ uiDensity = 'standard', children }) {
  const color = useSharedStateStore((state) => state.userProfile.sensory.color);

  const contrastClass = color === 'high_contrast' ? 'contrast-200' : '';
  const spacingClass = SPACING_CLASSES[uiDensity] ?? 'space-y-4';

  return (
    <div className={`${contrastClass} ${spacingClass}`.trim()} data-testid="adaptive-layout">
      {children}
    </div>
  );
}
