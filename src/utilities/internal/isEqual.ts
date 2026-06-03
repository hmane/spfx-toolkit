/**
 * Internal deep-equality check.
 *
 * Replaces the `isEqual` that was previously imported from the SPFx lodash-subset framework package, so
 * the toolkit carries NO SPFx framework runtime import for a simple value comparison. Importing that
 * package forced an SPFx framework external to load in consumers, which broke fast-serve / form-customizer
 * scenarios (the loader fell back to a `relative-path.invalid` URL for it). A self-contained helper avoids
 * that entirely and keeps the toolkit's zero-runtime-dependency guarantee.
 *
 * Scope: the value shapes the toolkit actually compares — primitives (incl. NaN), arrays, plain objects,
 * nested combinations of those, `Date`, and `null`/`undefined`. This is intentionally NOT a general
 * lodash replacement: no `Map`/`Set`/`RegExp`/typed-array/function-body semantics.
 */
export function isEqual(a: unknown, b: unknown): boolean {
  return deepEqual(a, b, new WeakMap<object, object>());
}

function deepEqual(a: unknown, b: unknown, seen: WeakMap<object, object>): boolean {
  // Fast path: identical reference or strictly-equal primitives.
  if (a === b) {
    return true;
  }
  // Past this point a !== b. If either is null/undefined they cannot be equal.
  if (a == null || b == null) {
    return false;
  }
  // Primitives that weren't `===`: equal only if both are NaN (SameValueZero).
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a !== a && b !== b;
  }

  const aIsDate = a instanceof Date;
  const bIsDate = b instanceof Date;
  if (aIsDate || bIsDate) {
    return aIsDate && bIsDate && (a as Date).getTime() === (b as Date).getTime();
  }

  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray || bIsArray) {
    if (!aIsArray || !bIsArray) {
      return false;
    }
    const arrA = a as unknown[];
    const arrB = b as unknown[];
    if (arrA.length !== arrB.length) {
      return false;
    }
    if (seen.get(a as object) === (b as object)) {
      return true; // cycle already being compared along this pair
    }
    seen.set(a as object, b as object);
    for (let i = 0; i < arrA.length; i++) {
      if (!deepEqual(arrA[i], arrB[i], seen)) {
        return false;
      }
    }
    return true;
  }

  // Plain objects.
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) {
    return false;
  }
  if (seen.get(a as object) === (b as object)) {
    return true; // cycle guard
  }
  seen.set(a as object, b as object);
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) {
      return false;
    }
    if (!deepEqual(objA[key], objB[key], seen)) {
      return false;
    }
  }
  return true;
}
