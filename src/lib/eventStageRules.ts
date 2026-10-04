import type { StatusFeatures } from './eventLifecycle';

export function canChangeStage({ current, target, furthest, stageCount, viaNext, scanRequired, unscanned, locked }: {
  current: number; target: number; furthest: number; stageCount: number;
  viaNext: boolean; scanRequired: boolean; unscanned: number; locked: boolean;
}) {
  if (locked || target < 0 || target >= stageCount || target === current) return false;
  if (target > furthest && (!viaNext || target !== current + 1)) return false;
  return !(target > current && scanRequired && unscanned > 0);
}

export function hasExclusiveFlagConflict(value: StatusFeatures, others: StatusFeatures[]) {
  return (value.cuttingStock && (value.stockReturn || others.some(row => row.cuttingStock))) ||
    (value.stockReturn && others.some(row => row.stockReturn));
}
