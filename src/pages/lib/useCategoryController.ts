import { useMemo } from "react";
import useGetAreaList from "../../hooks/api/useGetAreaList";
import useGetItemCategory from "../../hooks/api/useGetItemCategory";

export const useCategoryController = () => {
  const { data, refetch } = useGetItemCategory({
    options: {
      enabled: true,
    },
  });

  const categoryOptions = useMemo(() => {
    return data?.data?.data?.length ? data?.data?.data?.map((el: any) => {
      return {
        value: el.id.toString(),
        label: el.name,
      };
    }) : [];
  }, [data]);

  return {
    categories: data?.data?.data,
    categoryOptions,
    refetchCategory: refetch
  };
};
