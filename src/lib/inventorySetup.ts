// Read-only compatibility for the proposed backend flag. Never infer production
// drafts from a missing SKU, seed mock stock, or mark server records complete locally.
export function needsInventorySetup(item: { needs_setup?: boolean; needsSetup?: boolean }) {
  return item.needs_setup !== undefined ? item.needs_setup === true : item.needsSetup === true;
}
