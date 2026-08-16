import { BASE_PLATFORM_FEE, AI_FEATURE_FEE, MODULE_CATALOG, STORAGE_TIERS } from '../data/pricingCatalog';
import type { PricingPlan } from '../data/pricingPlans';

export function computePlanPrice(plan: PricingPlan): number {
  const modulesTotal = plan.modules.reduce((sum, key) => {
    const mod = MODULE_CATALOG.find(m => m.key === key);
    return sum + (mod ? mod.price : 0);
  }, 0);
  const aiFee = plan.aiFeature ? AI_FEATURE_FEE : 0;
  const tier = STORAGE_TIERS.find(t => t.gb === plan.storageGb) || STORAGE_TIERS[0];
  return BASE_PLATFORM_FEE + modulesTotal + aiFee + tier.price;
}

export function planFeatureList(plan: PricingPlan): string[] {
  const list = plan.modules.flatMap(key => {
    const label = MODULE_CATALOG.find(m => m.key === key)?.label;
    return label ? [label] : [];
  });
  if (plan.aiFeature) list.push('AI Analyzer (AI Feature)');
  const tier = STORAGE_TIERS.find(t => t.gb === plan.storageGb);
  list.push(`${tier ? tier.gb : plan.storageGb} GB Storage`);
  return list;
}
