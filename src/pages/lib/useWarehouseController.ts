import { useMemo } from "react";
import useGetAreaList from "../../hooks/api/useGetAreaList";
import useGetWarehouse from "../../hooks/api/useGetWarehouse";

export const useWarehouseController = () => {
  const { data: warehouses, refetch: refetchWarehouse } = useGetWarehouse({
    options: {
      enabled: true,
    },
  });

  const warehouseOptions = useMemo<{ value: string; label: string }[]>(() => {
    return warehouses?.data?.data?.length ? warehouses?.data?.data?.map((el: any) => {
      return {
        value: el.id.toString(),
        label: el.nama,
      };
    }) : [];
  }, [warehouses]);

  return {
    warehouses: warehouses?.data?.data ?? [],
    warehouseOptions,
    refetchWarehouse
  };
};
