
import { useInventory } from "../../../../hooks/useInventory";

export function useMovements() {
  const inventory = useInventory();

  return {
    ...inventory,
    movements: inventory.history,
  };
}
