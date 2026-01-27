import { useState, useEffect, useRef } from "react";

/**
 * Custom hook to throttle/debounce search query input
 * @param {string} value - The current search value
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {string} The throttled value
 */
export function useThrottledSearch(value, delay = 300) {
  const [throttledValue, setThrottledValue] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setThrottledValue(value);
    }, delay);

    // Cleanup on unmount or when value/delay changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  // Update throttled value immediately if value becomes empty
  useEffect(() => {
    if (value === "" || value.trim() === "") {
      setThrottledValue("");
    }
  }, [value]);

  return throttledValue;
}

