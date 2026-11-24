/**
 * 3 Star Protection — proposed backend / AI contract (NOT IMPLEMENTED YET). Owner 2026-11-24.
 *
 * Today the feature runs on a rule-based mock in the browser (src/lib/threeStar.ts): settings, briefs and
 * "done / dismissed" marks are in localStorage `emi.threeStar.v1`. To make it real and shared:
 *
 * GET  /v1/ai/three-star/settings            → ThreeStarSettingsDTO          (tenant)
 * PUT  /v1/ai/three-star/settings            (admin) body ThreeStarSettingsDTO
 * GET  /v1/events/{id}/brief                 → EventBriefDTO | null
 * PUT  /v1/events/{id}/brief                 body EventBriefDTO   (structured, AI-readable)
 * POST /v1/events/{id}/three-star/analyze    → ThreeStarAnalysisDTO
 *      Server builds the AI input from: event (dates, venue, description, notes), its item lines (name, qty,
 *      category, material, warehouse), the brief, availability by date (api-backlog §11), and the tenant
 *      settings; calls the LLM with a fixed JSON schema; validates the output; caches it until the event,
 *      items or brief change. Never sends other tenants' data to the model.
 * PUT  /v1/events/{id}/three-star/suggestions/{suggestionId}   body { state: "done" | "dismissed" | "open" }
 * POST /v1/events/{id}/three-star/checklist  → adds the suggested tasks to the event checklist group "3 Star · AI"
 *      (needs the checklist API, api-backlog §1).
 */

export type StarKeyDTO = 'brief' | 'items' | 'schedule';
export type SeverityDTO = 'risk' | 'warn' | 'tip';

export interface ThreeStarSettingsDTO {
  enabled: boolean;
  checks: Record<StarKeyDTO, boolean>;
  strictness: 'relaxed' | 'balanced' | 'strict';
  min_lead_days: number;
  setup_hours: number;
  suggest_checklist: boolean;
  audience: 'admins' | 'everyone';
}

export interface EventBriefDTO {
  event_type: 'wedding' | 'corporate' | 'birthday' | 'gala' | 'exhibition' | 'other' | null;
  guests: number | null;
  venue_type: 'indoor' | 'outdoor' | 'semi' | null;
  ground: 'grass' | 'sand' | 'floor' | 'carpet' | null;
  style: string;
  colors: string;
  load_in_at: string | null;      // ISO
  event_start_time: string | null; // HH:mm
  power: 'venue' | 'genset' | 'none' | null;
  rain_plan: 'tent' | 'indoor' | 'none' | null;
  priorities: string;
  updated_by: string;
  updated_at: string;
}

export interface ThreeStarSuggestionDTO {
  id: string;
  star: StarKeyDTO;
  severity: SeverityDTO;
  /** Stable code so web/mobile can translate (EN/ID), e.g. "round_table_ground". */
  code: string;
  title: string;   // model text, already in the user's language
  detail: string;
  params: Record<string, string | number>;
  related_item_ids: number[];
  state: 'open' | 'done' | 'dismissed';
}

export interface ThreeStarAnalysisDTO {
  event_id: number;
  earned: number; // 0..3
  stars: Array<{ key: StarKeyDTO; enabled: boolean; earned: boolean; score: number }>;
  brief_completeness: number; // 0..1
  suggestions: ThreeStarSuggestionDTO[];
  checklist: Array<{ code: string; title: string; due_offset_days: number; requires_photo: boolean; requires_report: boolean }>;
  model: string;
  analyzed_at: string;
}
