export const BASE_PLATFORM_FEE = 200000;
export const AI_FEATURE_FEE = 500000;

export interface PricingModule { key: string; label: string; price: number }
export interface StorageTier { gb: number; price: number }

export const MODULE_CATALOG: PricingModule[] = [
  { key: 'event',      label: 'Event Management',       price: 150000 },
  { key: 'inventory',  label: 'Inventory Management',    price: 150000 },
  { key: 'warehouse',  label: 'Warehouse Management',    price: 150000 },
  { key: 'qr-code',    label: 'QR Code Scanning',        price: 100000 },
  { key: 'reports',    label: 'Reports & Dashboard',      price: 100000 },
  { key: 'item-loan',  label: 'Item Loan Management',     price: 75000 },
];

export const STORAGE_TIERS: StorageTier[] = [
  { gb: 10,   price: 0 },
  { gb: 50,   price: 100000 },
  { gb: 100,  price: 200000 },
  { gb: 500,  price: 450000 },
  { gb: 1000, price: 800000 },
];
