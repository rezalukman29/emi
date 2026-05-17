import useGetAreaList from "../../hooks/api/useGetAreaList";

export const useAreaController = () => {
  const { data: areas } = useGetAreaList({
    options: {
      enabled: true,
    },
  });
  return {
    areas: areas?.data,
  };
};
