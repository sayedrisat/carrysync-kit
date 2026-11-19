
import { openFieldLedger } from "@carrysync/domain/indexeddb";

// Cache the promise so React StrictMode doesn't initialize it twice.
let runtime: ReturnType<typeof openFieldLedger> | undefined;

export const getFieldLedger = () => {
  runtime ??= openFieldLedger();
  return runtime;
};
