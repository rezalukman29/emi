import { useSyncExternalStore } from 'react';

// A/B layout preview (owner 2026-11-22). "A" = current layout, "B" = the cleaner proposal.
// Same data, logic and actions in both; only the arrangement changes. Saved per browser.
// The floating switcher (src/components/VariantSwitcher.tsx) changes it.

export type UiVariant = 'A' | 'B';
export const UI_VARIANT_KEY = 'emi.ui.variant.v1';

function read(): UiVariant {
  try {
    return window.localStorage.getItem(UI_VARIANT_KEY) === 'B' ? 'B' : 'A';
  } catch {
    return 'A';
  }
}

let current: UiVariant = read();
const listeners = new Set<() => void>();

export function setUiVariant(next: UiVariant) {
  current = next;
  try { window.localStorage.setItem(UI_VARIANT_KEY, next); } catch { /* private mode */ }
  listeners.forEach((listener) => listener());
}

window.addEventListener('storage', (event) => {
  if (event.key !== UI_VARIANT_KEY) return;
  current = read();
  listeners.forEach((listener) => listener());
});

export function useUiVariant(): UiVariant {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => current,
  );
}
