import { useSyncExternalStore } from 'react';

// 3 Star Protection (owner 2026-11-24) — PREVIEW, no backend yet (owner: "no need backend, use mock data first").
// An AI assistant that reads the event (dates, venue, notes), its items and a structured "AI brief", and gives:
//   ★ Brief    — is the event described well enough (format an AI can read)?
//   ★ Items    — do the chosen items suit the event (material, quantity vs guests, outdoor/indoor…)?
//   ★ Schedule — is there enough time (lead time, setup window, clashes)?
// plus a suggested default checklist for that event.
// The "AI" here is a deterministic rule engine with a small item knowledge base, so the UX can be tested
// on real events. The future API (LLM) contract is in src/hooks/api/threeStarContract.ts.
// Settings and briefs are stored per browser (localStorage) until that API exists.

export type Strictness = 'relaxed' | 'balanced' | 'strict';
export type StarKey = 'brief' | 'items' | 'schedule';
export type Severity = 'risk' | 'warn' | 'tip';

export interface ThreeStarSettings {
  enabled: boolean;
  checks: Record<StarKey, boolean>;
  strictness: Strictness;
  /** Fewer days than this between today and the event start is "too tight". */
  minLeadDays: number;
  /** Hours needed between load-in and the event start. */
  setupHours: number;
  /** Offer the AI checklist automatically when an event has none from 3 Star yet. */
  suggestChecklist: boolean;
  /** Who sees the 3 Star tab in Event Detail. */
  audience: 'admins' | 'everyone';
}

export const DEFAULT_THREE_STAR: ThreeStarSettings = {
  enabled: true,
  checks: { brief: true, items: true, schedule: true },
  strictness: 'balanced',
  minLeadDays: 14,
  setupHours: 6,
  suggestChecklist: true,
  audience: 'everyone',
};

export type EventType = 'wedding' | 'corporate' | 'birthday' | 'gala' | 'exhibition' | 'other';
export type VenueType = 'indoor' | 'outdoor' | 'semi';

/** Structured event brief: the format the AI reads. Every field is optional; completeness drives star 1. */
export interface EventBrief {
  eventType: EventType | '';
  guests: string;
  venueType: VenueType | '';
  ground: 'grass' | 'sand' | 'floor' | 'carpet' | '';
  style: string;
  colors: string;
  loadIn: string;   // yyyy-mm-ddThh:mm
  eventStartTime: string; // hh:mm
  power: 'venue' | 'genset' | 'none' | '';
  rainPlan: 'tent' | 'indoor' | 'none' | '';
  priorities: string;
  updatedAt?: string;
}

export const EMPTY_BRIEF: EventBrief = { eventType: '', guests: '', venueType: '', ground: '', style: '', colors: '', loadIn: '', eventStartTime: '', power: '', rainPlan: '', priorities: '' };

/** How a suggestion was handled. "Not relevant" needs a short reason (shown to the team). */
export interface Handling { state: 'done' | 'dismissed'; reason?: string; by: string; at: string }

/** Last computed score per event, so lists (Events page) can show stars without re-analysing. */
export interface ScoreSnapshot { earned: number; risks: number; open: number; at: string }

interface State {
  settings: ThreeStarSettings;
  briefs: Record<number, EventBrief>;
  /** Handled suggestions per event. */
  handled: Record<number, Record<string, Handling>>;
  scores: Record<number, ScoreSnapshot>;
  /** Briefs typed in the New Event form before the event had an id, keyed by "name|start". */
  pendingBriefs: Record<string, EventBrief>;
}

const KEY = 'emi.threeStar.v1';

function load(): State {
  const empty: State = { settings: DEFAULT_THREE_STAR, briefs: {}, handled: {}, scores: {}, pendingBriefs: {} };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      settings: { ...DEFAULT_THREE_STAR, ...parsed.settings, checks: { ...DEFAULT_THREE_STAR.checks, ...parsed.settings?.checks } },
      briefs: parsed.briefs ?? {},
      // v1 stored plain 'done' | 'dismissed' strings.
      handled: Object.fromEntries(Object.entries(parsed.handled ?? {}).map(([eventId, map]) => [eventId, Object.fromEntries(Object.entries(map as Record<string, unknown>).map(([id, value]) => [id, typeof value === 'string' ? { state: value as Handling['state'], by: '', at: '' } : value as Handling]))])),
      scores: parsed.scores ?? {},
      pendingBriefs: parsed.pendingBriefs ?? {},
    };
  } catch {
    return empty;
  }
}

let state: State = load();
const listeners = new Set<() => void>();
function emit() {
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
  listeners.forEach((listener) => listener());
}
window.addEventListener('storage', (event) => { if (event.key === KEY) { state = load(); listeners.forEach((l) => l()); } });

export function useThreeStar() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state);
}
export function saveThreeStarSettings(settings: ThreeStarSettings) { state = { ...state, settings }; emit(); }
export function saveBrief(eventId: number, brief: EventBrief) { state = { ...state, briefs: { ...state.briefs, [eventId]: { ...brief, updatedAt: new Date().toISOString() } } }; emit(); }
export function saveScore(eventId: number, snapshot: Omit<ScoreSnapshot, 'at'>) {
  const prev = state.scores[eventId];
  if (prev && prev.earned === snapshot.earned && prev.risks === snapshot.risks && prev.open === snapshot.open) return;
  state = { ...state, scores: { ...state.scores, [eventId]: { ...snapshot, at: new Date().toISOString() } } };
  emit();
}
export const pendingBriefKey = (name: string, start: string) => `${name.trim().toLowerCase()}|${start.slice(0, 10)}`;
export function savePendingBrief(key: string, brief: EventBrief) {
  state = { ...state, pendingBriefs: { ...state.pendingBriefs, [key]: brief } };
  emit();
}
/** Moves a brief typed in the New Event form onto the event once it has an id. */
export function claimPendingBrief(eventId: number, key: string) {
  const brief = state.pendingBriefs[key];
  if (!brief || state.briefs[eventId]) return;
  const rest = { ...state.pendingBriefs };
  delete rest[key];
  state = { ...state, pendingBriefs: rest, briefs: { ...state.briefs, [eventId]: { ...brief, updatedAt: new Date().toISOString() } } };
  emit();
}
export const briefHasContent = (brief: EventBrief) => Object.entries(brief).some(([key, value]) => key !== 'updatedAt' && String(value ?? '').trim() !== '');

export function markSuggestion(eventId: number, id: string, value: Handling | null) {
  const current = { ...(state.handled[eventId] ?? {}) };
  if (value) current[id] = value; else delete current[id];
  state = { ...state, handled: { ...state.handled, [eventId]: current } };
  emit();
}

// ───────────────────────────── analysis ─────────────────────────────

export interface AnalysisEvent {
  id: number;
  name: string;
  start: string; // yyyy-mm-dd
  end: string;
  loadInDate: string; // yyyy-mm-dd (date_event)
  address: string;
  pic: string;
  description: string;
  notes: string;
}
export interface AnalysisItem { name: string; qty: number; area: string }
export interface AnalysisClash { itemName: string; from: string; to: string; shortage: number }

export interface Suggestion {
  id: string;
  star: StarKey;
  severity: Severity;
  /** i18n key under threeStar.sug.<key>.title / .detail */
  key: string;
  params?: Record<string, string | number>;
  /** Optional quick action the UI can offer. */
  action?: 'openBrief' | 'openItems' | 'openChecklist';
  /** Item the suggestion is about (used to group suggestions per item and to open it). */
  itemName?: string;
  /** Search word for alternatives from the inventory (e.g. "kayu"). */
  altSearch?: string;
  /** Set when the team handled it. Handled suggestions no longer count against the stars. */
  handled?: Handling;
}

export interface StarResult { key: StarKey; score: number; earned: boolean; enabled: boolean }
export interface Analysis { stars: StarResult[]; earned: number; suggestions: Suggestion[]; briefCompleteness: number; checklist: Array<{ key: string; params?: Record<string, string | number>; requiresPhoto?: boolean; requiresReport?: boolean; dueOffsetDays: number }> }

const DAY = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00`) - Date.parse(`${from}T12:00:00`)) / DAY);
const has = (text: string, words: string[]) => words.some((w) => text.includes(w));

/** Tiny knowledge base of decoration items (Indonesian + English names). */
const KB = {
  roundTable: ['meja bulat', 'round table', 'meja bundar'],
  table: ['meja', 'table'],
  chair: ['kursi', 'chair', 'tiffany', 'chiavari'],
  glass: ['kaca', 'glass', 'akrilik', 'acrylic', 'kristal', 'crystal'],
  fabric: ['kain', 'fabric', 'taplak', 'tablecloth', 'drape', 'tirai', 'karpet', 'carpet'],
  light: ['lampu', 'light', 'led', 'lighting', 'spotlight', 'neon'],
  flower: ['bunga', 'flower', 'floral', 'mawar', 'rose'],
  wood: ['kayu', 'wood', 'rattan', 'rotan', 'bambu', 'bamboo'],
  stage: ['panggung', 'stage', 'backdrop', 'rigging', 'truss'],
  electronic: ['tv', 'led screen', 'videotron', 'speaker', 'sound', 'projector'],
};

export const LIMITS: Record<Strictness, { tight: number; briefPass: number }> = {
  relaxed: { tight: 0.5, briefPass: 0.5 },
  balanced: { tight: 1, briefPass: 0.7 },
  strict: { tight: 1.5, briefPass: 0.9 },
};

export function analyzeEvent(event: AnalysisEvent, items: AnalysisItem[], brief: EventBrief, settings: ThreeStarSettings, today: string, clashes: AnalysisClash[] = [], handled: Record<string, Handling> = {}): Analysis {
  const s: Suggestion[] = [];
  const add = (sug: Suggestion) => {
    const item = typeof sug.params?.item === 'string' ? sug.params.item : undefined;
    s.push({ ...sug, itemName: sug.itemName ?? item, handled: handled[sug.id] });
  };
  const limits = LIMITS[settings.strictness];
  const text = `${event.name} ${event.description} ${event.notes} ${brief.style} ${brief.priorities}`.toLowerCase();
  const outdoor = brief.venueType === 'outdoor' || (!brief.venueType && has(text, ['outdoor', 'garden', 'taman', 'pantai', 'beach', 'rooftop']));
  const guests = Number(brief.guests) || 0;

  // ★1 Brief
  const briefFields: Array<[keyof EventBrief, boolean]> = [
    ['eventType', Boolean(brief.eventType)], ['guests', guests > 0], ['venueType', Boolean(brief.venueType)],
    ['style', brief.style.trim().length > 2], ['loadIn', Boolean(brief.loadIn)], ['eventStartTime', Boolean(brief.eventStartTime)],
    ['power', Boolean(brief.power)], ['priorities', brief.priorities.trim().length > 10],
  ];
  if (outdoor) briefFields.push(['rainPlan', Boolean(brief.rainPlan)], ['ground', Boolean(brief.ground)]);
  const filled = briefFields.filter(([, ok]) => ok).length;
  const briefCompleteness = briefFields.length ? filled / briefFields.length : 0;
  if (settings.checks.brief) {
    const missing = briefFields.filter(([, ok]) => !ok).map(([key]) => key);
    if (missing.length) add({ id: 'brief-missing', star: 'brief', severity: briefCompleteness < 0.5 ? 'risk' : 'warn', key: 'briefMissing', params: { count: missing.length, fields: missing.join(',') }, action: 'openBrief' });
    if (!event.description.trim() || event.description.trim().length < 20) add({ id: 'brief-desc', star: 'brief', severity: 'tip', key: 'shortDescription', action: 'openBrief' });
    if (!event.address.trim()) add({ id: 'brief-address', star: 'brief', severity: 'warn', key: 'noAddress' });
    if (outdoor && brief.rainPlan === 'none') add({ id: 'brief-rain', star: 'brief', severity: 'risk', key: 'noRainPlan', action: 'openBrief' });
  }

  // ★2 Items
  const names = items.map((i) => ({ ...i, n: i.name.toLowerCase() }));
  const count = (words: string[]) => names.filter((i) => has(i.n, words)).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
  const find = (words: string[]) => names.filter((i) => has(i.n, words));
  if (settings.checks.items) {
    if (!items.length) add({ id: 'items-empty', star: 'items', severity: daysBetween(today, event.start) <= 14 ? 'risk' : 'tip', key: 'noItems', action: 'openItems' });
    const round = find(KB.roundTable);
    if (round.length && (outdoor && (brief.ground === 'grass' || brief.ground === 'sand'))) {
      add({ id: 'items-round-ground', star: 'items', severity: 'warn', key: 'roundTableGround', altSearch: 'kayu', params: { item: round[0].name, ground: brief.ground } });
    }
    if (round.length && !round.some((i) => has(i.n, KB.wood)) && (has(text, ['rustic', 'natural', 'garden', 'kayu', 'boho']) || outdoor)) {
      add({ id: 'items-round-wood', star: 'items', severity: 'tip', key: 'roundTableWood', altSearch: 'kayu', params: { item: round[0].name } });
    }
    const glass = find(KB.glass);
    if (glass.length && outdoor) add({ id: 'items-glass-outdoor', star: 'items', severity: 'warn', key: 'glassOutdoor', altSearch: 'kayu', params: { item: glass[0].name } });
    const fabric = find(KB.fabric);
    if (fabric.length && outdoor && brief.rainPlan !== 'tent') add({ id: 'items-fabric-rain', star: 'items', severity: 'warn', key: 'fabricRain', params: { item: fabric[0].name } });
    const lights = find(KB.light);
    if (lights.length && (brief.power === 'none' || (outdoor && !brief.power))) add({ id: 'items-power', star: 'items', severity: 'risk', key: 'lightsNoPower', params: { item: lights[0].name } });
    const electronics = find(KB.electronic);
    if (electronics.length && outdoor && brief.rainPlan !== 'tent' && brief.rainPlan !== 'indoor') add({ id: 'items-electronic', star: 'items', severity: 'warn', key: 'electronicsOutdoor', params: { item: electronics[0].name } });
    if (guests > 0) {
      const chairs = count(KB.chair);
      if (chairs > 0 && chairs < guests) add({ id: 'items-chairs', star: 'items', severity: chairs < guests * 0.8 ? 'risk' : 'warn', key: 'chairsShort', params: { chairs, guests, short: guests - chairs } });
      const roundQty = count(KB.roundTable);
      if (roundQty > 0 && roundQty * 10 < guests) add({ id: 'items-tables', star: 'items', severity: 'warn', key: 'tablesShort', params: { tables: roundQty, need: Math.ceil(guests / 10) } });
    }
    const flowers = find(KB.flower);
    if (flowers.length && daysBetween(event.loadInDate || event.start, event.start) >= 2) add({ id: 'items-flowers', star: 'items', severity: 'tip', key: 'flowersEarly', params: { item: flowers[0].name } });
    if (has(text, ['rustic', 'boho', 'natural']) && glass.length) add({ id: 'items-style', star: 'items', severity: 'tip', key: 'styleMismatch', altSearch: 'kayu', params: { style: brief.style || 'rustic', item: glass[0].name } });
    clashes.slice(0, 3).forEach((c, i) => add({ id: `items-clash-${i}`, star: 'items', severity: 'risk', key: 'stockClash', params: { item: c.itemName, shortage: c.shortage, from: c.from, to: c.to } }));
  }

  // ★3 Schedule
  if (settings.checks.schedule && event.start) {
    const lead = daysBetween(today, event.start);
    if (event.end && event.end < event.start) add({ id: 'sch-reversed', star: 'schedule', severity: 'risk', key: 'datesReversed' });
    if (lead < 0 && (!event.end || daysBetween(today, event.end) < 0)) add({ id: 'sch-past', star: 'schedule', severity: 'warn', key: 'eventPast' });
    else if (lead >= 0 && lead < settings.minLeadDays * limits.tight) add({ id: 'sch-tight', star: 'schedule', severity: lead < 7 ? 'risk' : 'warn', key: 'tooTight', params: { days: lead, min: settings.minLeadDays } });
    if (event.loadInDate && event.loadInDate === event.start && brief.loadIn && brief.eventStartTime) {
      const loadHour = Number(brief.loadIn.slice(11, 13)); const startHour = Number(brief.eventStartTime.slice(0, 2));
      if (startHour - loadHour < settings.setupHours) add({ id: 'sch-setup', star: 'schedule', severity: 'risk', key: 'setupShort', params: { hours: Math.max(0, startHour - loadHour), need: settings.setupHours } });
    } else if (event.loadInDate && event.loadInDate === event.start && !brief.loadIn) {
      add({ id: 'sch-sameday', star: 'schedule', severity: 'warn', key: 'sameDayLoadIn', action: 'openBrief' });
    }
    if (event.loadInDate && event.loadInDate > event.start) add({ id: 'sch-loadin-after', star: 'schedule', severity: 'risk', key: 'loadInAfterStart' });
    const days = event.end ? daysBetween(event.start, event.end) + 1 : 1;
    if (days > 1) add({ id: 'sch-multiday', star: 'schedule', severity: 'tip', key: 'multiDay', params: { days } });
  }

  const sevWeight: Record<Severity, number> = { risk: 40, warn: 15, tip: 0 };
  // Only suggestions the team has not handled count. Marking "Done" or "Not relevant" (with a reason) lifts the star.
  const live = s.filter((x) => !x.handled);
  const starScore = (key: StarKey) => Math.max(0, 100 - live.filter((x) => x.star === key).reduce((sum, x) => sum + sevWeight[x.severity], 0));
  const stars: StarResult[] = (['brief', 'items', 'schedule'] as StarKey[]).map((key) => {
    const enabled = settings.checks[key];
    const score = key === 'brief' ? Math.round(Math.min(starScore('brief'), briefCompleteness * 100)) : starScore(key);
    const earned = enabled && (key === 'brief'
      ? (briefCompleteness >= limits.briefPass || !live.some((x) => x.id === 'brief-missing')) && !live.some((x) => x.star === 'brief' && x.severity === 'risk')
      : !live.some((x) => x.star === key && x.severity === 'risk') && score >= 70);
    return { key, score, earned, enabled };
  });

  // Suggested default checklist for this event
  const cl: Analysis['checklist'] = [
    { key: 'confirmBrief', dueOffsetDays: -14 },
    { key: 'lockItems', dueOffsetDays: -7, requiresReport: true },
    { key: 'testItems', dueOffsetDays: -2, requiresPhoto: true },
    { key: 'loadingPlan', dueOffsetDays: -1 },
    { key: 'setupPhotos', dueOffsetDays: 0, requiresPhoto: true },
    { key: 'returnCheck', dueOffsetDays: 1, requiresPhoto: true, requiresReport: true },
  ];
  if (outdoor) cl.splice(1, 0, { key: 'weatherCheck', dueOffsetDays: -3 }, { key: 'rainBackup', dueOffsetDays: -3, requiresReport: true });
  if (find(KB.glass).length) cl.push({ key: 'wrapGlass', dueOffsetDays: -1, requiresPhoto: true });
  if (find(KB.light).length || find(KB.electronic).length) cl.push({ key: 'powerCheck', dueOffsetDays: -2, requiresReport: true });
  if (guests >= 300) cl.push({ key: 'floorPlan', dueOffsetDays: -10, params: { guests } });
  if (find(KB.flower).length) cl.push({ key: 'freshFlowers', dueOffsetDays: -1 });
  if (find(KB.stage).length) cl.push({ key: 'rigging', dueOffsetDays: 0, requiresPhoto: true });
  if (brief.eventType === 'wedding') cl.push({ key: 'weddingRundown', dueOffsetDays: -5 });

  /** Days before the start a "too tight" warning starts (min days × strictness factor). */
  const order: Record<Severity, number> = { risk: 0, warn: 1, tip: 2 };
  s.sort((a, b) => order[a.severity] - order[b.severity]);
  return { stars, earned: stars.filter((x) => x.earned).length, suggestions: s, briefCompleteness, checklist: cl };
}
