export interface PricingPlan {
  id: number;
  name: string;
  price: number;
  cycle: string;
  description: string;
  features: string[];
  customerCount: number;
  highlighted: boolean;
}

export const initialPricingPlans: PricingPlan[] = [
  {
    id: 1,
    name: 'Starter',
    price: 750000,
    cycle: 'month',
    description: 'For small event organizers just getting started.',
    features: ['Up to 3 active events', '1 warehouse', 'Basic inventory tracking', 'Email support'],
    customerCount: 34,
    highlighted: false,
  },
  {
    id: 2,
    name: 'Pro',
    price: 1500000,
    cycle: 'month',
    description: 'For growing teams managing multiple events at once.',
    features: ['Up to 15 active events', '5 warehouses', 'QR code scanning', 'Priority email support', 'AI Analyzer access'],
    customerCount: 52,
    highlighted: true,
  },
  {
    id: 3,
    name: 'Business',
    price: 3200000,
    cycle: 'month',
    description: 'For established event companies with larger inventories.',
    features: ['Unlimited active events', 'Unlimited warehouses', 'Advanced reporting', 'Dedicated support', 'Multi-user roles'],
    customerCount: 21,
    highlighted: false,
  },
  {
    id: 4,
    name: 'Enterprise',
    price: 0,
    cycle: 'custom',
    description: 'Custom pricing for large-scale operations with dedicated needs.',
    features: ['Custom integrations', 'SLA & onboarding', 'Dedicated account manager', 'On-premise option'],
    customerCount: 5,
    highlighted: false,
  },
];
