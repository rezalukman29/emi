import { useMemo } from "react";
import useGetAreaList from "../../hooks/api/useGetAreaList";
import useGetUnit from "../../hooks/api/useGetUnit";

export const useUnitController = () => {
  const { data } = useGetUnit({
    options: {
      enabled: true,
    },
  });

  const unitOptions = useMemo(() => {
    return data?.data?.length ? data?.data?.map((el: any) => {
      return {
        value: el.id.toString(),
        label: el.name,
      };
    }) : [];
  }, [data]);

  return {
    units: data?.data ?? [],
    unitOptions
  };
};
