import type { GeoJsonPoint } from '../geojson.model';

export const OpenAipAirportTypes = [
  'Airport (civil/military)',
  'Glider Site',
  'Airfield Civil',
  'International Airport',
  'Heliport Military',
  'Military Aerodrome',
  'Ultra Light Flying Site',
  'Heliport Civil',
  'Aerodrome Closed',
  'Airport resp. Airfield IFR',
  'Airfield Water',
  'Landing Strip',
  'Agricultural Landing Strip',
  'Altiport',
];

export interface IOpenAipAirport {
    _id: string;
    name: string;
    icaoCode?: string;
    iataCode?: string;
    type: number;
    country: string;
    geometry: GeoJsonPoint;
}
