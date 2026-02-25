import type { GeoJsonPolygon } from '../geojson.model';

export const OpenAipAirspaceTypes = [
  'Other',
  'Restricted',
  'Danger',
  'Prohibited',
  'Controlled Tower Region',
  'Transponder Mandatory Zone',
  'Radio Mandatory Zone',
  'Terminal Maneuvering Area',
  'Temporary Reserved Area',
  'Temporary Segregated Area',
  'Flight Information Region',
  'Upper Flight Information Region',
  'Air Defense Identification Zone',
  'Airport Traffic Zone',
  'Military Airport Traffic Zone',
  'Airway',
  'Military Training Route',
  'Alert Area',
  'Warning Area',
  'Protected Area',
  'Helicopter Traffic Zone',
  'Gliding Sector',
  'Transponder Setting',
  'Traffic Information Zone',
  'Traffic Information Area',
  'Military Training Area',
  'Control Area',
  'ACC Sector',
  'Aerial Sporting Or Recreational Activity',
  'Low Altitude Overflight Restriction',
  'Military Route',
  'TSA/TRA Feeding Route',
  'VFR Sector',
  'FIS Sector',
  'Lower Traffic Area',
  'Upper Traffic Area',
  'Military Controlled Tower Region',
];

export interface IOpenAipAirspace {
  _id: string;
  name: string;
  type: number;
  geometry: GeoJsonPolygon;
}
