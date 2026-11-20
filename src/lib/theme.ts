import { useSyncExternalStore } from 'react';

// Light / dark mode for the tenant app. The owner panel has its own dark theme (.sa-theme).
// Stored per browser in localStorage; nothing is sent to the backend.
// index.html applies the saved choice before the first paint (same key and rules as below).

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'emi.theme.v1';
/** Light by default, so nobody sees a change until they pick one. */
export const DEFAULT_THEME: ThemePreference = 'light';

const PREFERENCES: ThemePreference[] = ['light', 'dark', 'system'];
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return PREFERENCES.includes(value as ThemePreference) ? (value as ThemePreference) : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function systemIsDark() {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return systemIsDark() ? 'dark' : 'light';
  return preference;
}

let preference: ThemePreference = readPreference();
const listeners = new Set<() => void>();

function apply() {
  document.documentElement.setAttribute('data-theme', resolveTheme(preference));
}

function notify() {
  apply();
  listeners.forEach((listener) => listener());
}

export function setThemePreference(next: ThemePreference) {
  preference = next;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage blocked (private mode): the choice still applies until reload.
  }
  notify();
}

// Follow the OS while "system" is selected.
if (typeof window.matchMedia === 'function') {
  window.matchMedia(DARK_QUERY).addEventListener?.('change', () => {
    if (preference === 'system') notify();
  });
}
// Another tab changed it.
window.addEventListener('storage', (event) => {
  if (event.key !== THEME_STORAGE_KEY) return;
  preference = readPreference();
  notify();
});
apply();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current choice plus what is on screen now. */
export function useTheme() {
  const current = useSyncExternalStore(subscribe, () => preference);
  const resolved = useSyncExternalStore(subscribe, () => resolveTheme(preference));
  return { preference: current, resolved, setPreference: setThemePreference };
}
