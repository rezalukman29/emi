const ITEM_COUNTS = { Floral: 3, Furniture: 3, Lighting: 0, Fabric: 3, Decoration: 8, Equipment: 3 };

export const initialCategories = [
  { id: 1, name: 'Floral',     desc: 'Fresh and artificial flower arrangements',    itemCount: ITEM_COUNTS.Floral,     createdAt: '2024-01-05', updatedAt: '2024-03-10' },
  { id: 2, name: 'Furniture',  desc: 'Tables, chairs, and seating equipment',       itemCount: ITEM_COUNTS.Furniture,  createdAt: '2024-01-05', updatedAt: '2024-03-10' },
  { id: 3, name: 'Lighting',   desc: 'Stage and ambiance lighting equipment',       itemCount: ITEM_COUNTS.Lighting,   createdAt: '2024-01-05', updatedAt: '2024-03-12' },
  { id: 4, name: 'Fabric',     desc: 'Linens, drapes, and fabric materials',        itemCount: ITEM_COUNTS.Fabric,     createdAt: '2024-01-05', updatedAt: '2024-03-12' },
  { id: 5, name: 'Decoration', desc: 'Ornamental and decorative event accessories', itemCount: ITEM_COUNTS.Decoration, createdAt: '2024-01-05', updatedAt: '2024-04-01' },
  { id: 6, name: 'Equipment',  desc: 'Technical and functional event equipment',    itemCount: ITEM_COUNTS.Equipment,  createdAt: '2024-01-05', updatedAt: '2024-04-01' },
];
