import type { BarangGudangItem } from "../hooks/api/useGetBarangGudang";

export type MovingInventoryRow = BarangGudangItem & {
  local_only?: boolean;
};

export type MovingOrderHistory = {
  id: string;
  itemName: string;
  fromWarehouse: string;
  toWarehouse: string;
  qty: number;
  movedBy: string;
  movedAt: string;
};

export type MovingOrderSessionState = {
  movingOrders: MovingOrderHistory[];
  movingStockAdjustments: Record<number, number>;
  movingLocalRows: MovingInventoryRow[];
};

const STORAGE_KEY_PREFIX = "emi.moving-orders.session.v1";
const memoryStore: Record<string, MovingOrderSessionState> = {};

function emptySession(): MovingOrderSessionState {
  return {
    movingOrders: [],
    movingStockAdjustments: {},
    movingLocalRows: [],
  };
}

function storageKey() {
  if (typeof window === "undefined") {
    return `${STORAGE_KEY_PREFIX}.anonymous`;
  }

  try {
    const auth = JSON.parse(window.localStorage.getItem("auth") || "null") as {
      id?: number | string;
    } | null;
    return `${STORAGE_KEY_PREFIX}.${auth?.id ?? "anonymous"}`;
  } catch {
    return `${STORAGE_KEY_PREFIX}.anonymous`;
  }
}

function normalizeSession(value: unknown): MovingOrderSessionState {
  if (!value || typeof value !== "object") return emptySession();

  const session = value as Partial<MovingOrderSessionState>;
  return {
    movingOrders: Array.isArray(session.movingOrders)
      ? session.movingOrders
      : [],
    movingStockAdjustments:
      session.movingStockAdjustments
      && typeof session.movingStockAdjustments === "object"
        ? session.movingStockAdjustments
        : {},
    movingLocalRows: Array.isArray(session.movingLocalRows)
      ? session.movingLocalRows
      : [],
  };
}

export function getMovingOrderSession(): MovingOrderSessionState {
  const key = storageKey();

  if (typeof window === "undefined") {
    return memoryStore[key] ?? emptySession();
  }

  try {
    const stored = window.sessionStorage.getItem(key);
    if (!stored) return memoryStore[key] ?? emptySession();

    const session = normalizeSession(JSON.parse(stored));
    memoryStore[key] = session;
    return session;
  } catch {
    return memoryStore[key] ?? emptySession();
  }
}

export function saveMovingOrderSession(session: MovingOrderSessionState) {
  const key = storageKey();
  const normalized = normalizeSession(session);
  memoryStore[key] = normalized;

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify(normalized));
  } catch {
    // Keep the in-memory copy when sessionStorage is unavailable or full.
  }
}
