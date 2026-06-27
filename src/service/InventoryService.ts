/* eslint-disable no-extra-boolean-cast */
import moment from "moment";
import {
  APIResponse,
  BaseResponsePagination,
} from "../interfaces/BaseApiResponse";
import {
  BarangGudangI,
  InventoryFilterPropsI,
  InventoryHistoryI,
  InventoryImage,
  PayloadAddEventI,
  PayloadUploadImageI,
} from "../interfaces/InventoryInterface";

import ax from "./axios";
import axEmi from "./axiosEmi";

const URL = "barang";
const URL_WAREHOUSE = "barang-with-gudang";
const URL_BARANG_GUDANG = "barang-gudang";
const URL_BARANG_FILTER = "barang-filter?";
const URL_CATEGORY = "kategori-barang";
const URL_HISTORY_ITEM = "barang-gudang-history";
const URL_BARANG_IMAGE = "barang-image";
const URL_AREA = "area";

export const InventoryService = {
  getById: async (barangId: string) => {
    const response = await ax.get(`${URL}/${barangId}`);
    return response.data.data;
  },
  getDetailById: async (barangId: string) => {
    const response = await ax.get(`${URL_WAREHOUSE}/${barangId}`);
    return response.data.data;
  },
  getDetailBarangGudang: async (
    barangGudangId: number | null
  ): Promise<APIResponse<any>> => {
    const response = await ax.get(`/v1/${URL_BARANG_GUDANG}/${barangGudangId}`);
    return response.data;
  },
  getEvent: async (filter: any) => {
    const response = await ax.get(`/v1/event-filter`, {
      params: {
        page: filter.page,
        limit: filter.limit,
        sort: filter.sort,
        sort_by: filter.sortBy,
        ...(filter.search && { search: filter.search }),
        ...(filter.isUpcoming && !filter.onGoing && {
          event_start: moment().format("YYYY-MM-DD"),
        }),
        ...(!filter.isUpcoming && !filter.onGoing && { event_end: moment().format("YYYY-MM-DD") }),
        ...(filter.onGoing && { ongoing: true }),
      },
    });
    return response.data.data;
  },
  getScanEventBarang: async (
    barangGudangId: number | null,
    fixListItemId: number
  ): Promise<APIResponse<any>> => {
    const response = await ax.get(
      `scanInAPI?barang_gudang_id=${barangGudangId}&fix_list_item_id=${fixListItemId}`
    );
    return response.data;
  },
  getInventory: async (
    filter: InventoryFilterPropsI
  ): Promise<BaseResponsePagination<any>> => {
    const response = await ax.get(
      `/v1/${URL_BARANG_FILTER}${
        filter.category ? `kategori=${filter.category}&` : ""
      }page=${filter.page}&limit=${filter.limit}&sort=${filter.sort}&sort_by=${
        filter.sortBy
      }${filter.search ? `&search=${filter.search}` : ""}`
    );
    return response.data;
  },
  getCategory: async (page: number): Promise<Array<any>> => {
    const response = await ax.get(`${URL_CATEGORY}/event/page/${page}`);
    return response.data.data;
  },
  getHistoryItem: async (
    barangGudangId: number | null
  ): Promise<APIResponse<Array<InventoryHistoryI>>> => {
    const response = await ax.get(`${URL_HISTORY_ITEM}/${barangGudangId}`);
    return response.data;
  },
  getInventoryImages: async (
    barangId: number
  ): Promise<APIResponse<Array<InventoryImage>>> => {
    const response = await ax.get(`${URL_BARANG_IMAGE}/${barangId}`);
    return response.data;
  },
  uploadInventoryImage: async (
    data: PayloadUploadImageI
  ): Promise<APIResponse<any>> => {
    const response = await ax.post(`${URL_BARANG_IMAGE}`, {
      barang_id: data.id,
      detail: data.description,
      photo: data.photo,
    });
    return response.data;
  },
  getListArea: async (page: number): Promise<APIResponse<Array<any>>> => {
    const response = await ax.get(`${URL_AREA}/page/${page}`);
    return response.data;
  },
  getBarangGudang: async (
    gudangId: number | string,
    page: number,
    search: string,
    limit: number,
    sort?: string,
    sortBy?: string
  ): Promise<BaseResponsePagination<BarangGudangI[]>> => {
    const response = await ax.get(
      `v1/barang-gudang/detail?${
        gudangId === "All" || gudangId === null ? "" : `gudang_id=${gudangId}&`
      }page=${page}&limit=${limit}${search ? `&search=${search}` : ""}`,
      {
        params: {
          ...(sort && { sort: sort }),
          ...(sortBy && { sort_by: sortBy }),
        },
      }
    );
    return response.data.data;
  },
  getItemInventory: async ({
    params,
  }: {
    params: InventoryFilterPropsI;
  }): Promise<BaseResponsePagination<any>> => {
    const response = await ax.get(
      `${URL_BARANG_FILTER}${
        !!params.category ? `kategori=${params.category}&` : ""
      }page=${params.page}&limit=${params.limit}&order=${params.order}${
        !!params.search ? `&search=${params.search}` : ""
      }`
    );
    return response.data.data;
  },
  addEvent: async (data: PayloadAddEventI): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/event/create`, data);
    return response.data;
  },
  editEvent: async (data: PayloadAddEventI): Promise<APIResponse<any>> => {
    const response = await ax.put(`/v1/event/update`, data);
    return response.data;
  },
  deleteEvent: async ({ id }: { id: string }): Promise<any> => {
    const response = await ax.delete(`/v1/event/${id}`);
    return response.data;
  },
  getInventoryList: async (page: number): Promise<APIResponse<Array<any>>> => {
    const response = await ax.get(`/v1/${URL}/page/${page}?limit=20`);
    return response.data;
  },
  getSatuan: async () => {
    const response = await ax.get(`/v1/satuan`);
    return response.data;
  },
  getItemCategory: async (filter: any) => {
    const response = await ax.get(`/v1/kategori-barang-all`, {
      params: {
        sort: filter.sort,
        sort_by: filter.sort_by,
      },
    });
    return response.data;
  },
  addItemcategory: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/kategori-barang`, data);
    return response.data;
  },
  editItemCategory: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.put(`/v1/kategori-barang`, data);
    return response.data;
  },
  deleteItemCategory: async (id: any): Promise<APIResponse<any>> => {
    const response = await ax.delete(`/v1/kategori-barang/${id}`);
    return response.data;
  },
  addBarang: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/barang`, data);
    return response.data;
  },
  editBarang: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.put(`/v1/barang`, data);
    return response.data;
  },
  editBarangAITuneUp: async (data: {
    id: number;
    detail: string;
    harga_rata_rata: string;
    cara_pemakaian: string;
    hal_perlu_diperhatikan: string;
  }): Promise<APIResponse<any>> => {
    const response = await ax.put(`/v1/barang/ai-tuneup`, data);
    return response.data;
  },
  deleteBarang: async (id: any): Promise<APIResponse<any>> => {
    const response = await ax.delete(`/v1/barang/${id}`);
    return response.data;
  },
  deleteBarangGudang: async (id: any): Promise<APIResponse<any>> => {
    const response = await ax.delete(`/v1/barang-gudang/${id}`);
    return response.data;
  },
  addBarangGudang: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/barang-gudang`, data);
    return response.data;
  },
  editBarangGudang: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.put(`/v1/barang-gudang`, data);
    return response.data;
  },
  getArea: async (filter: any): Promise<APIResponse<any>> => {
    const response = await ax.get(`/v1/area`, {
      params: {
        sort: filter.sort,
        sort_by: filter.sortBy,
      },
    });
    return response.data;
  },
  addArea: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/area`, data);
    return response.data;
  },
  editArea: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.put(`/v1/area`, data);
    return response.data;
  },
  deleteArea: async (id: any): Promise<APIResponse<any>> => {
    const response = await ax.delete(`/v1/area/${id}`);
    return response.data;
  },
  deleteFixItem: async (id: any): Promise<APIResponse<any>> => {
    const response = await ax.delete(`/v1/fix-list-item/${id}`);
    return response.data;
  },
  getSubArea: async (filter: any): Promise<APIResponse<any>> => {
    const response = await ax.get(`/v1/sub-area`, {
      params: {
        sort: filter.sort,
        sort_by: filter.sortBy,
        page: 1,
        limit: 999
      },
    });
    return response.data;
  },
  addSubArea: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/sub-area`, data);
    return response.data;
  },
  editSubArea: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.put(`/v1/sub-area`, data);
    return response.data;
  },
  deleteSubArea: async (id: any): Promise<APIResponse<any>> => {
    const response = await ax.delete(`/v1/sub-area/${id}`);
    return response.data;
  },
  postLogin: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/login-emi`, data);
    return response.data;
  },
  loginFetch: async (body: any): Promise<APIResponse<any>> => {
    const result = await fetch(
      "https://emi-production.emi.web.id/v1/login",
      {
        method: "POST",
        body: JSON.stringify({
          email: body.email,
          password: body.password,
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      }
    );
    const data = await result.json();
    return data;
  },
  postRegister: async (body: any): Promise<APIResponse<any>> => {
    const result = await fetch(
      "https://emi-production.emi.web.id/v1/register",
      {
        method: "POST",
        body: JSON.stringify({
          fullname: body.name,
          email: body.email,
          password: body.password,
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      }
    );
    const data = await result.json();
    return data;
  },
  getEmiUser: async () => {
    const response = await ax.get(`/user/get-a11-d4t4-us3r`);
    return response.data;
  },
  getGudang: async () => {
    const response = await ax.get(`/v1/gudang?page=1&limit=1000`);
    return response.data;
  },
  addGudang: async (payload: any) => {
    const response = await ax.post(`/v1/gudang`, payload);
    return response.data;
  },
  editGudang: async (payload: any) => {
    const response = await ax.put(`/v1/gudang`, payload);
    return response.data;
  },
  deleteGudang: async (id: string) => {
    const response = await ax.delete(`/v1/gudang/${id}`);
    return response.data;
  },
  putScan: async (payload: any) => {
    const response = await ax.put(`/v1/fix-list-item/scan`, payload);
    return response.data;
  },
  getEventStatus: async (): Promise<APIResponse<any>> => {
    const response = await ax.get(`/v1/event-status/get-all`);
    return response.data;
  },
  putEventStatus: async (payload: any) => {
    const response = await ax.put(`/v1/event-status/update-scan`, payload);
    return response.data;
  },
  deleteStatus: async (id: string) => {
    const response = await ax.delete(`/v1/event-status/${id}`);
    return response.data;
  },
  putSyncInventory: async (id: string) => {
    const response = await ax.put(`/v1/barang/update-sync`, {
      barang_id: id,
    });
    return response.data;
  },
  getSyncInventory: async (): Promise<APIResponse<any>> => {
    const response = await ax.get(`/v1/barang/get-sync`);
    return response.data;
  },
  getEventInventory: async (filter: any) => {
    const response = await ax.get(`/v2/fix-list-item`, {
      params: {
        page: filter.page,
        limit: filter.limit,
        ...(filter.search && { search: filter.search }),
        sort: filter.sort,
        sort_by: filter.sortBy,
      },
    });
    return response.data.data;
  },
  addEventStatus: async (payload: any) => {
    const response = await ax.post(`/v1/event-status/create`, payload);
    return response.data;
  },
  getListAreaByEvent: async (eventId: string) => {
    const response = await ax.get(`/v1/fix-event-list-area/${eventId}`);
    return response.data.data;
  },
  addPackaging: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/package`, data);
    return response.data;
  },
  deletePackaging: async (id: any): Promise<APIResponse<any>> => {
    const response = await ax.delete(`/v1/package/${id}`);
    return response.data;
  },
  updatePackaging: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.put(`/v1/package`, data);
    return response.data;
  },
  addEventPackaging: async (data: any[]): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/event-item-package`, data);
    return response.data;
  },
  getEventPackaging: async (params: any): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/event-item-package`, {
      params: {
        event_id: params.event_id,
        package_id: params.package_id,
      },
    });
    return response.data;
  },
  addUser: async (data: PayloadAddEventI): Promise<APIResponse<any>> => {
    const response = await axEmi.post(`/v1/register`, data);
    return response.data;
  },
  editUser: async (data: PayloadAddEventI): Promise<APIResponse<any>> => {
    const response = await axEmi.put(`/v1/user/info/update`, data);
    return response.data;
  },
  deleteUser: async ({ id }: { id: string }): Promise<any> => {
    const response = await axEmi.delete(`/v1/user/${id}`);
    return response.data;
  },
  getAdminEvent: async (filter: any) => {
    const response = await ax.get(`/v1/event-admin`, {
      params: {
        page: filter.page,
        limit: filter.limit,
        sort: filter.sort,
        sort_by: filter.sortBy,
        ...(filter.search && { search: filter.search }),
      },
    });
    return response.data.data;
  },
  addAdminEvent: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/event-admin`, data);
    return response.data;
  },
  deleteAdminEvent: async (id: string): Promise<APIResponse<any>> => {
    const response = await ax.delete(`/v1/event-admin/${id}`);
    return response.data;
  },
  addStockOpname: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/stock-opname`, data);
    return response.data;
  },
  getStockOpname: async (
    page: number,
    search: string,
    limit: number,
    sort?: string,
    sortBy?: string
  ): Promise<BaseResponsePagination<any[]>> => {
    const response = await ax.get(
      `v1/stock-opname?page=${page}&limit=${limit}${
        search ? `&search=${search}` : ""
      }`,
      {
        params: {
          ...(sort && { sort: sort }),
          ...(sortBy && { sort_by: sortBy }),
        },
      }
    );
    return response.data.data;
  },
  deleteStockOpname: async (id: any): Promise<APIResponse<any>> => {
    const response = await ax.delete(`/v1/stock-opname/${id}`);
    return response.data;
  },
  applyStockOpname: async (id: any): Promise<APIResponse<any>> => {
    const response = await ax.put(`/v1/stock-opname/apply/${id}`);
    return response.data;
  },
  rollbackStockOpname: async (id: any): Promise<APIResponse<any>> => {
    const response = await ax.put(`/v1/stock-opname/rollback/${id}`);
    return response.data;
  },
  addSatuan: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/satuan`, data);
    return response.data;
  },
  editSatuan: async (data: any): Promise<APIResponse<any>> => {
    const response = await ax.put(`/v1/satuan`, data);
    return response.data;
  },
  deleteSatuan: async (id: any): Promise<APIResponse<any>> => {
    const response = await ax.delete(`/v1/satuan/${id}`);
    return response.data;
  },
  getDeletedItems: async ({
    area_id,
    sub_area_id,
  }: {
    area_id?: number;
    sub_area_id?: number;
  }): Promise<APIResponse<any[]>> => {
    const response = await ax.get("v3/fix-list-item-event-by-area", {
      params: {
        ...(area_id && { area_id }),
        ...(sub_area_id && { sub_area_id }),
      },
    });
    return response.data;
  },
    getEventlog: async (
    id: number
  ): Promise<APIResponse<any>> => {
    const response = await ax.get(`/v3/event-log/${id}`);
    return response.data;
  },
  sendOtp: async (email: any): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/forgot-password-otp`, {
      email
    });
    return response.data;
  },
  resetPassword: async (payload: any): Promise<APIResponse<any>> => {
    const response = await ax.post(`/v1/reset-password`, payload);
    return response.data;
  },
  getEventSummary: async (eventId: string) => {
    const response = await ax.get(`v1/event-summary/${eventId}`);
    return response.data.data;
  },
  getAreaDetail: async (id: any): Promise<APIResponse<any>> => {
    const response = await ax.get(`/v1/area/${id}`);
    return response.data;
  },
};
