
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

  const refresh = useCallback(async (currentService: FieldLedgerService) => {
    try {
      setError(null);

      const [nextInventory, nextHistory] = await Promise.all([
        currentService.getInventory(),
        currentService.getHistory(),
      ]);

      setInventory(nextInventory);
      setHistory(nextHistory);
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const initialize = async () => {
      try {
        const runtime = await getFieldLedger();

        if (!active) return;

        const currentService = runtime.service;

        setService(currentService);

        unsubscribe = currentService.onChange(() => {
          if (active) {
            void refresh(currentService);
          }
        });

        await refresh(currentService);
      } catch (err) {
        if (active) {
          setError(describeError(err).message);
          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [refresh]);

  return {
    service,
    inventory,
    products: inventory?.products ?? [],
    warnings: inventory?.warnings ?? [],
    history,
    loading,
    error,
    refresh: () => service ? refresh(service) : Promise.resolve(),
  };
}
