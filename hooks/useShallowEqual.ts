import { useRef } from 'react';

/**
 * Shallow equality check - returns true if all first-level properties are equal
 */
function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  return keys1.every(key => obj1[key] === obj2[key]);
}

/**
 * useShallowEqual - Memoizes an object by shallow equality
 * Only returns a new reference if shallow properties changed
 * Useful to prevent re-renders when context values haven't fundamentally changed
 *
 * Example:
 * ```typescript
 * const { isPro, isAdmin } = useShallowEqual(context);
 * ```
 */
export function useShallowEqual<T extends object>(value: T): T {
  const ref = useRef(value);

  if (!shallowEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
}

export { shallowEqual };
