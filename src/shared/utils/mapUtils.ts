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

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Fast circle-vs-rectangle intersection test in meters using a local equirectangular
 * approximation around the circle center (accurate for small regions like geohash cells).
 */
const circleIntersectsBboxMeters = (
  center: LatLon, // [lat, lon]
  radiusMeters: number,
  bbox: { south: number; west: number; north: number; east: number },
): boolean => {
  const [lat0, lon0] = center;

  if (!Number.isFinite(lat0) || !Number.isFinite(lon0) || !Number.isFinite(radiusMeters)) return false;

  const deg2rad = Math.PI / 180;
  const earthRadiusM = 6_371_000;
  const metersPerDegLat = earthRadiusM * deg2rad;
  const metersPerDegLon = earthRadiusM * Math.cos(lat0 * deg2rad) * deg2rad;

  // Convert bbox corners to local meters relative to center.
  const xWest = (bbox.west - lon0) * metersPerDegLon;
  const xEast = (bbox.east - lon0) * metersPerDegLon;
  const ySouth = (bbox.south - lat0) * metersPerDegLat;
  const yNorth = (bbox.north - lat0) * metersPerDegLat;

  const minX = Math.min(xWest, xEast);
  const maxX = Math.max(xWest, xEast);
  const minY = Math.min(ySouth, yNorth);
  const maxY = Math.max(ySouth, yNorth);

  // Circle center is at (0, 0) in this coordinate system.
  const closestX = clamp(0, minX, maxX);
  const closestY = clamp(0, minY, maxY);

  const dx = closestX;
  const dy = closestY;

  return dx * dx + dy * dy <= radiusMeters * radiusMeters;
};

const circleIntersectsGeohashCell = (
  center: LatLon, // [lat, lon]
  radiusMeters: number,
  hash: string,
): boolean => {
  const [minLat, minLon, maxLat, maxLon] = ngeohash.decode_bbox(hash);

  return circleIntersectsBboxMeters(center, radiusMeters, {
    south: minLat,
    west: minLon,
    north: maxLat,
    east: maxLon,
  });
};

export const geometryToIncludedGeohashes = (geometry?: GeoJsonGeometry, precision = 8, radius?: number): string[] => {
  if (!geometry) return [];
  if (geometry.type !== 'Polygon' && geometry.type !== 'Circle') return [];

  if (geometry.type === 'Circle' && radius) {
    // GeoJSON stores positions as [lon, lat]; our LatLon is [lat, lon]
    const [lon, lat] = geometry.coordinates;
    const center: LatLon = [lat, lon];

    const rectangle = circleToRectangle([center], radius);
    const bbox = rectangle
      ? {
        south: rectangle.lat[0],
        west: rectangle.lon[0],
        north: rectangle.lat[1],
        east: rectangle.lon[1],
      }
      : null;

    if (!bbox) return [];
    const candidates = ngeohash.bboxes(bbox.south, bbox.west, bbox.north, bbox.east, precision);

    // Keep only cells whose bbox actually intersects the circle.
    return candidates.filter(h => circleIntersectsGeohashCell(center, radius, h));
  } else if (geometry.type === 'Polygon') {
    const bbox = getPolygonBBox(geometry);

    if (!bbox) return [];
    const candidates = ngeohash.bboxes(bbox.south, bbox.west, bbox.north, bbox.east, precision);
    const zonePoly = turfPolygon(geometry.coordinates);

    // Keep cells that intersect the polygon (boundaries included)
    return candidates.filter(h => booleanIntersects(zonePoly, geohashCellPolygon(h)));
  }

  return [];
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

export const circleToRectangle = (coordinates?: LatLon[], radius?: number): IRectangle | null => {
  if (!coordinates || !radius) return null;

  // `radius` is in meters; convert to degrees to approximate a bounding rectangle.
  const [lat, lon] = coordinates[0];
  const radiusMeters = radius;

  // 1 degree latitude ~= 111_320 meters
  const deltaLat = radiusMeters / 111_320;

  // 1 degree longitude ~= 111_320 * cos(latitude) meters
  const latRad = (lat * Math.PI) / 180;
  const metersPerDegLon = 111_320 * Math.max(Math.cos(latRad), 1e-6);
  const deltaLon = radiusMeters / metersPerDegLon;

  return {
    lat: [lat - deltaLat, lat + deltaLat],
    lon: [lon - deltaLon, lon + deltaLon],
  };
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
