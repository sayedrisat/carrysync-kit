
import { useCallback, useEffect, useState } from "react";
import { describeError } from "@carrysync/domain";
import { getFieldLedger } from "../services/sync";

type Runtime = Awaited<ReturnType<typeof getFieldLedger>>;
type FieldLedgerService = Runtime["service"];
type Inventory = Awaited<ReturnType<FieldLedgerService["getInventory"]>>;
type History = Awaited<ReturnType<FieldLedgerService["getHistory"]>>;

export function useInventory() {
  const [service, setService] = useState<FieldLedgerService | null>(null);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [history, setHistory] = useState<History>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getFieldLedger()
      .then(({ service }) => {
        if (active) setService(service);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(describeError(err).message);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!service) return;

    try {
      setError(null);

      const [nextInventory, nextHistory] = await Promise.all([
        service.getInventory(),
        service.getHistory(),
      ]);

      setInventory(nextInventory);
      setHistory(nextHistory);
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (!service) return;

    const unsubscribe = service.onChange(() => {
      void refresh();
    });

    void refresh();

    return unsubscribe;
  }, [service, refresh]);

  return {
    service,
    inventory,
    products: inventory?.products ?? [],
    warnings: inventory?.warnings ?? [],
    history,
    loading,
    error,
    refresh,
  };
}
