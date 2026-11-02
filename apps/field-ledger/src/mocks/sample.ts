import type { EventInput } from '@carrysync/core';

// Public demo data only. This fixture is not a synchronization implementation.
export const sampleInput = { type: 'stock.moved', data: { productId: 'demo-rice', quantityDelta: 5 } } satisfies EventInput<'field-ledger'>;
