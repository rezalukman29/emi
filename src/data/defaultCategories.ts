export interface DefaultCategory {
  id: number;
  name: string;
  desc: string;
  status: string;
  usageCount: number;
}

export const initialDefaultCategories: DefaultCategory[] = [
  { id: 1, name: 'Floral',     desc: 'Fresh and artificial flower arrangements',    status: 'active',   usageCount: 48 },
  { id: 2, name: 'Furniture',  desc: 'Tables, chairs, and seating equipment',       status: 'active',   usageCount: 52 },
  { id: 3, name: 'Lighting',   desc: 'Stage and ambiance lighting equipment',       status: 'active',   usageCount: 41 },
  { id: 4, name: 'Fabric',     desc: 'Linens, drapes, and fabric materials',        status: 'active',   usageCount: 37 },
  { id: 5, name: 'Decoration', desc: 'Ornamental and decorative event accessories', status: 'active',   usageCount: 55 },
  { id: 6, name: 'Equipment',  desc: 'Technical and functional event equipment',    status: 'active',   usageCount: 44 },
  { id: 7, name: 'Catering',   desc: 'Food service and catering-related items',     status: 'inactive', usageCount: 12 },
];
