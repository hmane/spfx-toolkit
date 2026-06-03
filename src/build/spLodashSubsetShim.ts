type PropertyPath = string | number | Array<string | number>;

const getPathParts = (path: PropertyPath): Array<string | number> => {
  if (Array.isArray(path)) {
    return path;
  }
  return String(path)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
};

const getByPath = (value: any, path: PropertyPath): any => {
  let current = value;
  for (const part of getPathParts(path)) {
    if (current == null) {
      return undefined;
    }
    current = current[part as any];
  }
  return current;
};

const matchesObject = (candidate: any, expected: Record<string, any>): boolean => {
  if (candidate == null) {
    return false;
  }
  return Object.keys(expected).every(key => isEqual(candidate[key], expected[key]));
};

const iterateeValue = (item: any, iteratee?: string | ((item: any) => any)): any => {
  if (typeof iteratee === 'function') {
    return iteratee(item);
  }
  if (typeof iteratee === 'string') {
    return getByPath(item, iteratee);
  }
  return item;
};

export function chunk<T>(array: T[] | undefined | null, size = 1): T[][] {
  if (!array || size < 1) {
    return [];
  }
  const out: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

export function clone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.slice() as T;
  }
  if (value && typeof value === 'object') {
    return { ...(value as any) };
  }
  return value;
}

export function cloneDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => cloneDeep(item)) as T;
  }
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value as any)) {
      out[key] = cloneDeep((value as any)[key]);
    }
    return out as T;
  }
  return value;
}

export function escape(value: any): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function findIndex<T>(
  array: T[] | undefined | null,
  predicate: ((item: T, index: number, array: T[]) => boolean) | Record<string, any>
): number {
  if (!array) {
    return -1;
  }
  const matcher =
    typeof predicate === 'function'
      ? predicate
      : (item: T): boolean => matchesObject(item, predicate);
  for (let i = 0; i < array.length; i++) {
    if (matcher(array[i], i, array)) {
      return i;
    }
  }
  return -1;
}

export function groupBy<T>(array: T[] | undefined | null, iteratee?: string | ((item: T) => any)): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  if (!array) {
    return out;
  }
  for (const item of array) {
    const key = String(iterateeValue(item, iteratee as any));
    (out[key] || (out[key] = [])).push(item);
  }
  return out;
}

export function has(value: any, path: PropertyPath): boolean {
  let current = value;
  for (const part of getPathParts(path)) {
    if (current == null || !Object.prototype.hasOwnProperty.call(Object(current), part)) {
      return false;
    }
    current = current[part as any];
  }
  return true;
}

export function isEmpty(value: any): boolean {
  if (value == null) {
    return true;
  }
  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }
  if (value instanceof Map || value instanceof Set) {
    return value.size === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  return true;
}

export function isEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) &&
      a.length === b.length && a.every((item, i) => isEqual(item, b[i]));
  }
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return aKeys.length === bKeys.length &&
    aKeys.every(key => Object.prototype.hasOwnProperty.call(b, key) && isEqual(a[key], b[key]));
}

export function sortBy<T>(array: T[] | undefined | null, iteratee?: string | ((item: T) => any)): T[] {
  if (!array) {
    return [];
  }
  return array.slice().sort((a, b) => {
    const av = iterateeValue(a, iteratee as any);
    const bv = iterateeValue(b, iteratee as any);
    if (av === bv) {
      return 0;
    }
    if (av == null) {
      return 1;
    }
    if (bv == null) {
      return -1;
    }
    return av > bv ? 1 : -1;
  });
}
