import type { GeoJsonGeometry } from './geojson.model.ts';

export interface IZone {
  id?: string;
  fileName?: string;
  name?: string;
  type?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  heights?: number[];
  geohashes?: string[];
  geometry?: GeoJsonGeometry;
}

export const defaultValue: Readonly<IZone> = {};
