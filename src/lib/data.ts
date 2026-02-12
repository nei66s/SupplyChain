import { buildSeedData } from '@/lib/pilot/seed';

const seed = buildSeedData();

export const mockUsers = seed.users;
export const mockOrders = seed.orders;
export const mockMaterials = seed.materials.map((material) => {
  const balance = seed.stockBalances.find((item) => item.materialId === material.id);
  const onHand = balance?.onHand ?? 0;
  const reserved = balance?.reservedTotal ?? 0;
  return {
    id: material.id,
    name: material.name,
    uom: material.standardUom,
    onHand,
    reserved,
    available: Math.max(0, onHand - reserved),
  };
});
