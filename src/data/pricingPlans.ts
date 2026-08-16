export interface PricingPlan {
  id: number;
  name: string;
  cycle: string;
  description: string;
  modules: string[];
  aiFeature: boolean;
  storageGb: number;
  customerCount: number;
  highlighted: boolean;
}

export const initialPricingPlans: PricingPlan[] = [
  {
    id: 1,
    name: 'Starter',
    cycle: 'month',
    description: 'For small event organizers just getting started.',
    modules: ['event', 'inventory'],
    aiFeature: false,
    storageGb: 10,
    customerCount: 34,
    highlighted: false,
  },
  {
    id: 2,
    name: 'Pro',
    cycle: 'month',
    description: 'For growing teams managing multiple events at once.',
    modules: ['event', 'inventory', 'warehouse', 'qr-code'],
    aiFeature: true,
    storageGb: 50,
    customerCount: 52,
    highlighted: true,
  },
  {
    id: 3,
    name: 'Business',
    cycle: 'month',
    description: 'For established event companies with larger inventories.',
    modules: ['event', 'inventory', 'warehouse', 'qr-code', 'reports', 'item-loan'],
    aiFeature: true,
    storageGb: 100,
    customerCount: 21,
    highlighted: false,
  },
  {
    id: 4,
    name: 'Enterprise',
    cycle: 'custom',
    description: 'Custom pricing for large-scale operations with dedicated needs.',
    modules: ['event', 'inventory', 'warehouse', 'qr-code', 'reports', 'item-loan'],
    aiFeature: true,
    storageGb: 1000,
    customerCount: 5,
    highlighted: false,
  },
];
