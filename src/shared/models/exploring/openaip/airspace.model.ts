import type { GeoJsonPolygon } from '../geojson.model';

export type OpenAipAirspaceType = {
  label: string;
  color: string;
};

export const OpenAipAirspaceTypes: OpenAipAirspaceType[] = [
  { label: 'Other', color: 'rgb(156, 163, 175)' },
  { label: 'Restricted', color: 'rgb(220, 38, 38)' },
  { label: 'Danger', color: 'rgb(245, 158, 11)' },
  { label: 'Prohibited', color: 'rgb(127, 29, 29)' },
  { label: 'Controlled Tower Region', color: 'rgb(14, 165, 233)' },
  { label: 'Transponder Mandatory Zone', color: 'rgb(139, 92, 246)' },
  { label: 'Radio Mandatory Zone', color: 'rgb(6, 182, 212)' },
  { label: 'Terminal Maneuvering Area', color: 'rgb(59, 130, 246)' },
  { label: 'Temporary Reserved Area', color: 'rgb(220, 38, 38)' },
  { label: 'Temporary Segregated Area', color: 'rgb(220, 38, 38)' },
  { label: 'Flight Information Region', color: 'rgb(100, 116, 139)' },
  { label: 'Upper Flight Information Region', color: 'rgb(100, 116, 139)' },
  { label: 'Air Defense Identification Zone', color: 'rgb(220, 38, 38)' },
  { label: 'Airport Traffic Zone', color: 'rgb(99, 102, 241)' },
  { label: 'Military Airport Traffic Zone', color: 'rgb(220, 38, 38)' },
  { label: 'Airway', color: 'rgb(132, 204, 22)' },
  { label: 'Military Training Route', color: 'rgb(220, 38, 38)' },
  { label: 'Alert Area', color: 'rgb(234, 179, 8)' },
  { label: 'Warning Area', color: 'rgb(249, 115, 22)' },
  { label: 'Protected Area', color: 'rgb(34, 197, 94)' },
  { label: 'Helicopter Traffic Zone', color: 'rgb(14, 165, 233)' },
  { label: 'Gliding Sector', color: 'rgb(168, 85, 247)' },
  { label: 'Transponder Setting', color: 'rgb(139, 92, 246)' },
  { label: 'Traffic Information Zone', color: 'rgb(6, 182, 212)' },
  { label: 'Traffic Information Area', color: 'rgb(6, 182, 212)' },
  { label: 'Military Training Area', color: 'rgb(220, 38, 38)' },
  { label: 'Control Area', color: 'rgb(14, 165, 233)' },
  { label: 'ACC Sector', color: 'rgb(100, 116, 139)' },
  {
    label: 'Aerial Sporting Or Recreational Activity',
    color: 'rgb(249, 115, 22)',
  },
  {
    label: 'Low Altitude Overflight Restriction',
    color: 'rgb(127, 29, 29)',
  },
  { label: 'Military Route', color: 'rgb(220, 38, 38)' },
  { label: 'TSA/TRA Feeding Route', color: 'rgb(220, 38, 38)' },
  { label: 'VFR Sector', color: 'rgb(132, 204, 22)' },
  { label: 'FIS Sector', color: 'rgb(100, 116, 139)' },
  { label: 'Lower Traffic Area', color: 'rgb(139, 92, 246)' },
  { label: 'Upper Traffic Area', color: 'rgb(59, 130, 246)' },
  { label: 'Military Controlled Tower Region', color: 'rgb(220, 38, 38)' },
];

export interface IOpenAipAirspace {
  _id: string;
  name: string;
  type: number;
  geometry: GeoJsonPolygon;
}
