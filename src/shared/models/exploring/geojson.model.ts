export type GeoJsonPoint = {
  type: 'Point';
  /** [longitude, latitude] */
  coordinates: [number, number];
};

export type GeoJsonPolygon = {
  type: 'Polygon';
  /**
   * Array of linear rings. For zones we use a single outer ring.
   * Each position is [longitude, latitude].
   */
  coordinates: Array<Array<[number, number]>>;
};

export type GeoJsonCircle = {
  type: 'Circle';
  /**
   * [longitude, latitude]
   * expect a radius property (in meters) in the properties object
   */
  coordinates: [number, number];
};

export type GeoJsonGeometry = GeoJsonPoint | GeoJsonPolygon | GeoJsonCircle;

export type GeoJsonFeature = {
  type: 'Feature';
  geometry?: GeoJsonGeometry;
  properties?: Record<string, unknown>;
};

export type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
};
