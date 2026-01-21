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

export type GeoJsonGeometry = GeoJsonPoint | GeoJsonPolygon;

