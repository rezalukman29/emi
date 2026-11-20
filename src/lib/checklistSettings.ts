import { useSyncExternalStore } from 'react';

// Event Checklist feature switches, edited on /event-checklist-settings.
// Preview: stored in this browser (localStorage). Backend contract:
// GET/PUT /v1/event-checklist-settings (see src/hooks/api/eventChecklistContract.ts).

export type SignerRole = 'supervisor' | 'client';
export type SignerMode = SignerRole | 'both';
export type DeletePermission = 'everyone' | 'admin' | 'nobody';

export interface ChecklistSettings {
  photos: {
    enabled: boolean;
    /** Max photos per task. */
    maxPerTask: number;
    /** false = camera only on phones (no picking old photos from the gallery). */
    allowGallery: boolean;
  };
  notes: {
    enabled: boolean;
    /** Require a note when a task is marked Not applicable or Issue. */
    requireForException: boolean;
  };
  notApplicable: boolean;
  issues: boolean;
  signOff: {
    enabled: boolean;
    signer: SignerMode;
    requireSignature: boolean;
    /** Backend: refuse moving the event to the next stage until this stage is signed off. */
    requiredBeforeNextStage: boolean;
    lockAfterSignOff: boolean;
  };
  dueDates: boolean;
  assignees: boolean;
  extraTasks: boolean;
  deleteTasks: DeletePermission;
}

export const DEFAULT_CHECKLIST_SETTINGS: ChecklistSettings = {
  photos: { enabled: true, maxPerTask: 5, allowGallery: true },
  notes: { enabled: true, requireForException: true },
  notApplicable: true,
  issues: true,
  signOff: { enabled: true, signer: 'supervisor', requireSignature: true, requiredBeforeNextStage: true, lockAfterSignOff: true },
  dueDates: true,
  assignees: true,
  extraTasks: true,
  deleteTasks: 'admin',
};

const STORAGE_KEY = 'emi.checklistSettings.v1';
const listeners = new Set<() => void>();

function merge(saved: Partial<ChecklistSettings> | null): ChecklistSettings {
  const d = DEFAULT_CHECKLIST_SETTINGS;
  if (!saved) return d;
  return {
    ...d,
    ...saved,
    photos: { ...d.photos, ...saved.photos },
    notes: { ...d.notes, ...saved.notes },
    signOff: { ...d.signOff, ...saved.signOff },
  };
}

function read(): ChecklistSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return merge(raw ? (JSON.parse(raw) as Partial<ChecklistSettings>) : null);
  } catch {
    return DEFAULT_CHECKLIST_SETTINGS;
  }
}

let current: ChecklistSettings = read();

export function getChecklistSettings() {
  return current;
}

export function saveChecklistSettings(next: ChecklistSettings) {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked (private mode): keep the value for this session only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useChecklistSettings() {
  return useSyncExternalStore(subscribe, getChecklistSettings, getChecklistSettings);
}
