export interface City {
  id: string;
  name: string;
  country?: string;
  temp?: number;
  feels_like?: number;
  weather?: string;
    wind?: {
    speed?: number;
    deg?: number;
  };
  pressure?: number;
  humidity?: number;
  dew_point?: number;
  visibility?: number;
}