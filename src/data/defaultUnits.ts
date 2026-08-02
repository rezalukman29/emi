export interface DefaultUnit {
  id: number;
  name: string;
  abbr: string;
  type: string;
  status: string;
  usageCount: number;
}

export const initialDefaultUnits: DefaultUnit[] = [
  { id: 1, name: 'Centimeter', abbr: 'cm',  type: 'Length', status: 'active', usageCount: 39 },
  { id: 2, name: 'Meter',      abbr: 'm',   type: 'Length', status: 'active', usageCount: 46 },
  { id: 3, name: 'Kilogram',   abbr: 'kg',  type: 'Weight', status: 'active', usageCount: 33 },
  { id: 4, name: 'Gram',       abbr: 'g',   type: 'Weight', status: 'active', usageCount: 21 },
  { id: 5, name: 'Liter',      abbr: 'L',   type: 'Volume', status: 'active', usageCount: 18 },
  { id: 6, name: 'Piece',      abbr: 'pcs', type: 'Count',  status: 'active', usageCount: 61 },
];
