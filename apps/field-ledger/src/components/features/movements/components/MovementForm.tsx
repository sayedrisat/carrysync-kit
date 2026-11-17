
import ProductForm, {
  type MovementDraft,
} from "../../inventroy/components/ProductForm";

import type { useInventory } from "../../../../hooks/useInventory";

type Product = ReturnType<typeof useInventory>["products"][number];

interface Props {
  products: Product[];
  initialProductId?: string | undefined;
  onSubmit: (draft: MovementDraft) => Promise<void>;
  onCancel: () => void;
}

export type { MovementDraft };

export default function MovementForm({
  products,
  initialProductId,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <ProductForm
      products={products}
      initialProductId={initialProductId}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
