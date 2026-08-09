export type EventType = "upcoming" | "past";

export interface EventData {
  id: number;
  name: string;
  desc: string;
  start: string;
  finish: string;
  date: string;
  code: string;
  location: string;
  type: EventType;
  itemCount?: number;
}

export const TODAY: Date;
export const initialEvents: EventData[];
