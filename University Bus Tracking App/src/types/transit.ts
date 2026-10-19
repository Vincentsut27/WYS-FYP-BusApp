export interface Stop {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
}

export interface CampusBuilding {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Route {
  id: string;
  label: string;
  title?: string;
  description: string;
  color: string;
  operatingDays: string;
  serviceHours: string;
  frequency: string;
  notes?: string;
  stopIds: string[];
  travelTimesSeconds: number[];
  departureIntervals?: number[];
  departureMinutes?: number[];
}

export type SearchStop = Stop & { searchIds: string[] };
export type JourneyNotification = {
  route: Route;
  origin: Stop;
  arrivalMinutes: number;
};
