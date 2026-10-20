import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useAutoScroll Hook
 * Provides smooth, hands-free auto-scrolling with adjustable speed and reference management.
 */
export function useAutoScroll({ initialSpeed = 1, stepMs = 50, pxPerStep = 1 } = {}) {
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(initialSpeed);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    let scrollInterval = null;
    if (isAutoScrolling && scrollContainerRef.current) {
      scrollInterval = setInterval(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop += scrollSpeed * pxPerStep;
        }
      }, stepMs);
    }
    return () => {
      if (scrollInterval) clearInterval(scrollInterval);
    };
  }, [isAutoScrolling, scrollSpeed, stepMs, pxPerStep]);

  const toggleAutoScroll = useCallback(() => {
    setIsAutoScrolling((prev) => !prev);
  }, []);

  const resetScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);

  return {
    isAutoScrolling,
    setIsAutoScrolling,
    scrollSpeed,
    setScrollSpeed,
    scrollContainerRef,
    toggleAutoScroll,
    resetScroll,
  };
}

export default useAutoScroll;
