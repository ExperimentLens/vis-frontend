import type { GeoJsonFeature } from './geojson.model.ts';

export type ZoneType = 'general' | 'restriction';
export const ZoneTypeValues = ['general', 'restriction'];

export interface IZone {
  id?: string;
  fileName?: string;
  name?: string;
  type?: ZoneType;
  description?: string;
  status?: string;
  createdAt?: string;
  heights?: number[];
  geohashes?: string[];
  feature?: GeoJsonFeature;
}

export const defaultValue: Readonly<IZone> = {};
