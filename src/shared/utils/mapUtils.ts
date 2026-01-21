import ngeohash from 'ngeohash';
import { polygon as turfPolygon } from '@turf/helpers';
import booleanIntersects from '@turf/boolean-intersects';
import type { LatLon } from '../models/exploring/latlon.model';
import type { GeoJsonGeometry, GeoJsonPolygon } from '../models/exploring/geojson.model';
import type { IRectangle } from '../models/exploring/rectangle.model';

export const getPolygonBBox = (
  poly: GeoJsonPolygon,
): { south: number; west: number; north: number; east: number } | null => {
  const ring = poly.coordinates?.[0] ?? [];

  if (ring.length === 0) return null;

  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;

  for (const [lon, lat] of ring) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lon);
    east = Math.max(east, lon);
  }

  if (!Number.isFinite(south) || !Number.isFinite(west) || !Number.isFinite(north) || !Number.isFinite(east)) {
    return null;
  }

  return { south, west, north, east };
};

export const geohashCellPolygon = (hash: string) => {
  const [minLat, minLon, maxLat, maxLon] = ngeohash.decode_bbox(hash);

  return turfPolygon([[
    [minLon, maxLat], // NW
    [maxLon, maxLat], // NE
    [maxLon, minLat], // SE
    [minLon, minLat], // SW
    [minLon, maxLat], // close
  ]]);
};

export const geometryToIncludedGeohashes = (geometry?: GeoJsonGeometry, precision = 8): string[] => {
  if (!geometry) return [];
  if (geometry.type !== 'Polygon') return [];

  const bbox = getPolygonBBox(geometry);

  if (!bbox) return [];

  const candidates = ngeohash.bboxes(bbox.south, bbox.west, bbox.north, bbox.east, precision);
  const zonePoly = turfPolygon(geometry.coordinates);

  // Keep cells that intersect the polygon (boundaries included)
  return candidates.filter(h => booleanIntersects(zonePoly, geohashCellPolygon(h)));
};

export const coordinatesToRectangle = (coordinates?: LatLon[]): IRectangle | null => {
  if (!coordinates || coordinates.length === 0) return null;

  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;

  for (const p of coordinates) {
    const lat = p?.[0];
    const lon = p?.[1];

    if (typeof lat !== 'number' || typeof lon !== 'number') continue;
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lon);
    east = Math.max(east, lon);
  }

  if (!Number.isFinite(south) || !Number.isFinite(west) || !Number.isFinite(north) || !Number.isFinite(east)) {
    return null;
  }

  return { lat: [south, north], lon: [west, east] };
};

export const rectangleToGeoJsonPolygon = (rect: IRectangle): GeoJsonPolygon => {
  const south = rect.lat[0];
  const north = rect.lat[1];
  const west = rect.lon[0];
  const east = rect.lon[1];

  // GeoJSON positions are [lon, lat] and ring must be closed
  return {
    type: 'Polygon',
    coordinates: [[
      [west, north], // NW
      [east, north], // NE
      [east, south], // SE
      [west, south], // SW
      [west, north], // close
    ]],
  };
};

export const geoPointsToGeoJsonPolygon = (coordinates: LatLon[]): GeoJsonPolygon => {
  // GeoJSON positions are [lon, lat]
  const ring: Array<[number, number]> = coordinates.map(([lat, lon]) => [lon, lat]);

  // close the ring if needed
  if (ring.length > 0) {
    const [lon0, lat0] = ring[0];
    const [lonn, latn] = ring[ring.length - 1];

    if (lon0 !== lonn || lat0 !== latn) {
      ring.push([lon0, lat0]);
    }
  }

  return { type: 'Polygon', coordinates: [ring] };
};

export const geoJsonPolygonToGeoPoints = (poly: GeoJsonPolygon): LatLon[] => {
  const ring = poly.coordinates?.[0] ?? [];

  if (ring.length === 0) return [];

  // drop closing coordinate if present
  const isClosed =
    ring.length >= 2 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];

  const openRing = isClosed ? ring.slice(0, -1) : ring;

  // Return [lat, lon]
  return openRing.map(([lon, lat]) => [lat, lon]);
};

export const geoJsonPolygonToRectangle = (poly: GeoJsonPolygon): IRectangle | null => {
  const ring = poly.coordinates?.[0] ?? [];

  if (ring.length === 0) return null;

  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;

  for (const [lon, lat] of ring) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lon);
    east = Math.max(east, lon);
  }

  if (!Number.isFinite(south) || !Number.isFinite(west) || !Number.isFinite(north) || !Number.isFinite(east)) {
    return null;
  }

  return { lat: [south, north], lon: [west, east] };
};

export const isAxisAlignedRectanglePolygon = (poly: GeoJsonPolygon): boolean => {
  const ring = poly.coordinates?.[0] ?? [];

  if (ring.length !== 5) return false; // 4 corners + closing point

  // must be closed
  if (ring[0][0] !== ring[4][0] || ring[0][1] !== ring[4][1]) return false;

  // bbox corners must match the 4 unique points
  const rect = geoJsonPolygonToRectangle(poly);

  if (!rect) return false;

  const south = rect.lat[0];
  const north = rect.lat[1];
  const west = rect.lon[0];
  const east = rect.lon[1];

  const expected = new Set([
    `${west},${north}`,
    `${east},${north}`,
    `${east},${south}`,
    `${west},${south}`,
  ]);

  // collect unique (excluding closing)
  const seen = new Set<string>();

  for (let i = 0; i < 4; i++) {
    const [lon, lat] = ring[i];

    seen.add(`${lon},${lat}`);
  }

  if (seen.size !== 4) return false;
  for (const p of seen) {
    if (!expected.has(p)) return false;
  }

  return true;
};
