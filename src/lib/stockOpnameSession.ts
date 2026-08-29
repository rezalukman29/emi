type StockOpnameResolutionStatus = "REJECTED";

export interface StockOpnameLocalResolution {
  status: StockOpnameResolutionStatus;
  resolvedAt: string;
  resolvedBy: string;
}

export interface StockOpnameLocalItem {
  id: number;
  itemName: string;
  warehouseName: string;
  systemStock: number;
  actualStock: number;
  condition: "Good" | "Poor";
  note: string;
}

export interface StockOpnameLocalSubmission {
  id: number;
  period: string;
  remark: string;
  createdAt: string;
  items: StockOpnameLocalItem[];
}

interface StockOpnameStatusRecord {
  id: number;
  status?: string;
  is_applied?: number | boolean;
}

const STORAGE_KEY_PREFIX = "emi.stock-opname.local-resolutions.v1";
const SUBMISSION_STORAGE_KEY_PREFIX = "emi.stock-opname.local-submissions.v1";
const memoryStore: Record<
  string,
  Record<string, StockOpnameLocalResolution>
> = {};
const submissionMemoryStore: Record<
  string,
  Record<string, StockOpnameLocalSubmission>
> = {};

function tenantScopedKey(prefix: string) {
  if (typeof window === "undefined") return prefix;

  try {
    const auth = JSON.parse(window.localStorage.getItem("auth") || "null") as {
      id?: number | string;
    } | null;
    return `${prefix}.${auth?.id ?? "anonymous"}`;
  } catch {
    return `${prefix}.anonymous`;
  }
}

function storageKey() {
  return tenantScopedKey(STORAGE_KEY_PREFIX);
}

function readResolutions(): Record<string, StockOpnameLocalResolution> {
  if (typeof window === "undefined") return {};

  const key = storageKey();
  try {
    const value = window.sessionStorage.getItem(key);
    if (!value) return memoryStore[key] ?? {};
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      memoryStore[key] = parsed;
      return parsed;
    }
    return memoryStore[key] ?? {};
  } catch {
    return memoryStore[key] ?? {};
  }
}

function writeResolutions(
  resolutions: Record<string, StockOpnameLocalResolution>,
) {
  if (typeof window === "undefined") return;

  const key = storageKey();
  memoryStore[key] = resolutions;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(resolutions));
  } catch {
    // A blocked/full sessionStorage must never break the API-backed history page.
  }
}

export function getStockOpnameLocalResolution(
  id: number,
): StockOpnameLocalResolution | undefined {
  return readResolutions()[String(id)];
}

export function rejectStockOpnameLocally(id: number, resolvedBy: string) {
  const resolutions = readResolutions();
  const resolution: StockOpnameLocalResolution = {
    status: "REJECTED",
    resolvedAt: new Date().toISOString(),
    resolvedBy,
  };

  resolutions[String(id)] = resolution;
  writeResolutions(resolutions);
  return resolution;
}

export function clearStockOpnameLocalResolution(id: number) {
  const resolutions = readResolutions();
  if (!resolutions[String(id)]) return;

  delete resolutions[String(id)];
  writeResolutions(resolutions);
}

function readSubmissions(): Record<string, StockOpnameLocalSubmission> {
  if (typeof window === "undefined") return {};

  const key = tenantScopedKey(SUBMISSION_STORAGE_KEY_PREFIX);
  try {
    const value = window.sessionStorage.getItem(key);
    if (!value) return submissionMemoryStore[key] ?? {};
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      submissionMemoryStore[key] = parsed;
      return parsed;
    }
    return submissionMemoryStore[key] ?? {};
  } catch {
    return submissionMemoryStore[key] ?? {};
  }
}

function writeSubmissions(
  submissions: Record<string, StockOpnameLocalSubmission>,
) {
  if (typeof window === "undefined") return;

  const key = tenantScopedKey(SUBMISSION_STORAGE_KEY_PREFIX);
  submissionMemoryStore[key] = submissions;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(submissions));
  } catch {
    // Keep the in-memory fallback when sessionStorage is unavailable.
  }
}

export function saveStockOpnameLocalSubmission(
  submission: StockOpnameLocalSubmission,
) {
  const submissions = readSubmissions();
  submissions[String(submission.id)] = submission;
  writeSubmissions(submissions);
}

export function getStockOpnameLocalSubmission(id: number) {
  return readSubmissions()[String(id)];
}

export function getEffectiveStockOpnameStatus(
  record: StockOpnameStatusRecord,
) {
  const apiStatus = record.status?.trim().toUpperCase();

  // A resolved API state always wins over a stale current-session override.
  if (apiStatus && apiStatus !== "PENDING") return apiStatus;
  if (record.is_applied) return "APPROVED";

  return getStockOpnameLocalResolution(record.id)?.status ?? "PENDING";
}
