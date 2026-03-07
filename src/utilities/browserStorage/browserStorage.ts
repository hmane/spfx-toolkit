export type BrowserStorageType = 'localStorage' | 'sessionStorage';

export interface BrowserStorageOptions<T> {
  fallback?: T;
  parse?: (value: string) => T;
  preferred?: BrowserStorageType[];
  serialize?: (value: T) => string;
}

const DEFAULT_PREFERRED_STORAGE: BrowserStorageType[] = ['localStorage', 'sessionStorage'];

export function isBrowserStorageAvailable(type: BrowserStorageType): boolean {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    const storage = window[type];
    const testKey = '__spfx_toolkit_storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function getAvailableBrowserStorage(
  preferred: BrowserStorageType[] = DEFAULT_PREFERRED_STORAGE
): Storage | null {
  for (const type of preferred) {
    if (isBrowserStorageAvailable(type)) {
      return window[type];
    }
  }

  return null;
}

export function readBrowserStorageValue<T>(
  key: string,
  options: BrowserStorageOptions<T> = {}
): T | undefined {
  const { fallback, parse = JSON.parse as (value: string) => T, preferred } = options;
  const storage = getAvailableBrowserStorage(preferred);

  if (!storage) {
    return fallback;
  }

  const stored = storage.getItem(key);
  if (stored === null) {
    return fallback;
  }

  return parse(stored);
}

export function writeBrowserStorageValue<T>(
  key: string,
  value: T,
  options: BrowserStorageOptions<T> = {}
): boolean {
  const { preferred, serialize = JSON.stringify as (value: T) => string } = options;
  const storage = getAvailableBrowserStorage(preferred);

  if (!storage) {
    return false;
  }

  storage.setItem(key, serialize(value));
  return true;
}

export function removeBrowserStorageValue(
  key: string,
  preferred: BrowserStorageType[] = DEFAULT_PREFERRED_STORAGE
): boolean {
  const storage = getAvailableBrowserStorage(preferred);

  if (!storage) {
    return false;
  }

  storage.removeItem(key);
  return true;
}
