/* eslint-disable @typescript-eslint/naming-convention */
type links = {
  first: string | null;
  last: string | null;
  next: string | null;
  prev: string | null;
};

type meta = {
  current_page: number;
  from: number;
  last_page: number;
  path: string;
  per_page: number;
  to: number;
  total: number;
};

export interface APIResponse<T> {
  data: T;
  links?: links;
  meta?: meta;
  message: string;
  success: boolean;
  error?: boolean;
}

export interface BaseResponsePagination<T> {
  data: T;
  page: number;
  total_pages: number;
  total_records: number;
  prev: number;
  next: number;
  record_per_page: number;
}
