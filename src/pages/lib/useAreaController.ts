import { useMemo } from "react";
import useGetAreaList from "../../hooks/api/useGetAreaList";

export const useAreaController = () => {
  const { data: areas } = useGetAreaList({
    options: {
      enabled: true,
    },
  });

  const areaOptions = useMemo(() => {
    return areas?.data?.data?.length ? areas?.data?.data?.map((el) => {
      return {
        value: el.id.toString(),
        label: el.name,
      };
    }) : [];
  }, [areas]);

  return {
    areas: areas?.data?.data,
    areaOptions
  };
};
