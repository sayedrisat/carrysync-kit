
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

  const loadInventory = useCallback(
    async (
      currentService: FieldLedgerService,
      isActive: () => boolean = () => true
    ) => {
      try {
        setError(null);

        const [nextInventory, nextHistory] = await Promise.all([
          currentService.getInventory(),
          currentService.getHistory(),
        ]);

        if (!isActive()) return;

        setInventory(nextInventory);
        setHistory(nextHistory);
      } catch (err) {
        if (isActive()) {
          setError(describeError(err).message);
        }
      } finally {
        if (isActive()) {
          setLoading(false);
        }
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!service) return;
    await loadInventory(service);
  }, [service, loadInventory]);

  // Initialize the Field Ledger service
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

  // Load inventory and subscribe to changes
  useEffect(() => {
  if (!service) return;

  let active = true;

  const unsubscribe = service.onChange(() => {
    void loadInventory(service, () => active);
  });

  const initialize = async () => {
    await loadInventory(service, () => active);
  };

  void initialize();

  return () => {
    active = false;
    unsubscribe();
  };
}, [service, loadInventory]);

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
