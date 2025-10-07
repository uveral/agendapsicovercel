'use client';

import { useRef, useEffect } from 'react';

export function RenderDetector({ name, children }: { name: string; children: React.ReactNode }) {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  renderCount.current++;

  useEffect(() => {
    const elapsed = Date.now() - startTime.current;
    if (renderCount.current > 20 && elapsed < 5000) {
      console.error(`[RenderDetector] ${name} has rendered ${renderCount.current} times in ${elapsed}ms - INFINITE LOOP DETECTED!`);
    } else if (renderCount.current > 5) {
      console.warn(`[RenderDetector] ${name} render count: ${renderCount.current}`);
    }
  });

  return <>{children}</>;
}
