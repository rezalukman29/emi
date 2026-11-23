import { useSyncExternalStore } from 'react';

// A/B layout preview (owner 2026-11-22). "A" = current layout, "B" = the proposal.
// Same data, logic and actions in both; only the arrangement changes. Saved per browser.
// Each part of the UI that is being tested has its own scope, so it can be switched on its own
// (owner 2026-11-23: Event Detail page and the Add Items modal). The floating switcher
// (src/components/VariantSwitcher.tsx) changes them.

export type UiVariant = 'A' | 'B';
export type UiScope = 'eventDetail' | 'addItems';

/** localStorage keys. `eventDetail` keeps the original key so saved choices survive. */
export const UI_VARIANT_KEYS: Record<UiScope, string> = {
  eventDetail: 'emi.ui.variant.v1',
  addItems: 'emi.ui.variant.addItems.v1',
};

function read(scope: UiScope): UiVariant {
  try {
    return window.localStorage.getItem(UI_VARIANT_KEYS[scope]) === 'B' ? 'B' : 'A';
  } catch {
    return 'A';
  }
}

const current: Record<UiScope, UiVariant> = { eventDetail: read('eventDetail'), addItems: read('addItems') };
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function setUiVariant(next: UiVariant, scope: UiScope = 'eventDetail') {
  current[scope] = next;
  try { window.localStorage.setItem(UI_VARIANT_KEYS[scope], next); } catch { /* private mode */ }
  notify();
}

window.addEventListener('storage', (event) => {
  const scope = (Object.keys(UI_VARIANT_KEYS) as UiScope[]).find((key) => UI_VARIANT_KEYS[key] === event.key);
  if (!scope) return;
  current[scope] = read(scope);
  notify();
});

export function useUiVariant(scope: UiScope = 'eventDetail'): UiVariant {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => current[scope],
  );
}
