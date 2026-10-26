import { useQuery } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface EventCalendarEvent {
  booking_from: string;
  booking_to: string;
  id: number;
  location: string;
  name: string;
}

export interface EventCalendarDay {
  date: string;
  events: EventCalendarEvent[];
}

export interface EventCalendarData {
  days: EventCalendarDay[];
  month: string;
  summary: {
    events_this_month: number;
  };
}

export interface EventCalendarClashEvent {
  id: number;
  name: string;
  qty: number;
}

export interface EventCalendarClash {
  demand: number;
  events: EventCalendarClashEvent[];
  from: string;
  item_id: number;
  item_name: string;
  shortage: number;
  stock: number;
  to: string;
}

export interface EventCalendarClashDay {
  date: string;
  item_clash_count: number;
  item_short_count: number;
}

export interface EventCalendarClashData {
  clashes: EventCalendarClash[];
  days: EventCalendarClashDay[];
  month: string;
  summary: {
    days_with_clashes: number;
    items_clashing: number;
    items_short: number;
  };
}

export async function getEventCalendar(month: string): Promise<APIResponse<EventCalendarData>> {
  const { data } = await ax.get<APIResponse<EventCalendarData>>("/v1/event-calendar", {
    params: { month },
  });
  if (!data.success) throw new Error(data.message);
  return data;
}

export async function getEventCalendarClashes(month: string): Promise<APIResponse<EventCalendarClashData>> {
  const { data } = await ax.get<APIResponse<EventCalendarClashData>>("/v1/event-calendar/clashes", {
    params: { month },
  });
  if (!data.success) throw new Error(data.message);
  return data;
}

export function useGetEventCalendar(month: string) {
  return useQuery(["event-calendar", month], () => getEventCalendar(month), {
    keepPreviousData: true,
  });
}

export function useGetEventCalendarClashes(month: string) {
  return useQuery(["event-calendar", "clashes", month], () => getEventCalendarClashes(month), {
    keepPreviousData: true,
  });
}
