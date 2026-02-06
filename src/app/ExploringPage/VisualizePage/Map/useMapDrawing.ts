import L from 'leaflet';
import ngeohash from 'ngeohash';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../../store/store';
import { coordinatesToRectangle } from '../../../../shared/utils/mapUtils';
import type { LatLon } from '../../../../shared/models/exploring/latlon.model';

export const useMapDrawing = (map: L.Map | null, id: string) => {
  const navigate = useNavigate();
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const drawnShape = useAppSelector(state => state.map.drawnShape);
  const { selectedGeohash } = useAppSelector(state => state.map);
  const lastDrawnBounds = useRef<{
    south: number;
    west: number;
    north: number;
    east: number;
  } | null>(null);
  const onVisibilityChangeRef = useRef<(() => void) | null>(null);

  const drawRectangleFromBounds = (
    bounds: {
      south: number;
      west: number;
      north: number;
      east: number;
    } | null,
  ) => {
    if (!bounds || !map) return;

    // Check if bounds are the same as last drawn
    if (
      lastDrawnBounds.current &&
      lastDrawnBounds.current.south === bounds.south &&
      lastDrawnBounds.current.west === bounds.west &&
      lastDrawnBounds.current.north === bounds.north &&
      lastDrawnBounds.current.east === bounds.east
    ) {
      return; // Already drawn, skip
    }

    const leafletBounds = L.latLngBounds(
      [bounds.south, bounds.west],
      [bounds.north, bounds.east],
    );

    const rectangle = L.rectangle(leafletBounds, {
      color: '#3388ff',
      weight: 2,
      fillOpacity: 0.1,
      interactive: false,
    });

    // Clear existing drawn items
    drawnItemsRef.current.clearLayers();

    // Add the new rectangle
    drawnItemsRef.current.addLayer(rectangle);

    // Update last drawn bounds
    lastDrawnBounds.current = bounds;

    // Fit map to the rectangle bounds but with a buffer of 250px
    map.flyToBounds(leafletBounds, { padding: [250, 250] });

    if (selectedGeohash.rect) {
      const ghash = ngeohash.encode(
        leafletBounds.getCenter().lat,
        leafletBounds.getCenter().lng,
        8,
      );

      navigate(`?geohash=${ghash}`);
    }

    // Notify parent component to update visibility
    if (onVisibilityChangeRef.current) {
      onVisibilityChangeRef.current();
    }
  };

  const drawPolygon = (coordinates: LatLon[]) => {
    if (!coordinates || !map) return;

    // Check if coordinates are the same as last drawn
    const bounds = coordinatesToRectangle(coordinates);

    if (bounds && lastDrawnBounds.current && lastDrawnBounds.current.south === bounds.lat[0] && lastDrawnBounds.current.west === bounds.lon[0] && lastDrawnBounds.current.north === bounds.lat[1] && lastDrawnBounds.current.east === bounds.lon[1]) {
      return; // Already drawn, skip
    }

    const polygon = L.polygon(coordinates.map(([lat, lon]) => L.latLng(lat, lon)), {
      color: '#3388ff',
      weight: 2,
      fillOpacity: 0.1,
      interactive: false,
    });

    drawnItemsRef.current.clearLayers();
    drawnItemsRef.current.addLayer(polygon);
    lastDrawnBounds.current = bounds && {
      south: bounds.lat[0],
      west: bounds.lon[0],
      north: bounds.lat[1],
      east: bounds.lon[1],
    };

    map.flyToBounds(polygon.getBounds(), { padding: [250, 250] });

    // Notify parent component to update visibility
    if (onVisibilityChangeRef.current) {
      onVisibilityChangeRef.current();
    }
  };

  const drawCircle = (coordinates: LatLon[], radius: number) => {
    if (!coordinates || !radius || !map) return;

    const center = L.latLng(coordinates[0][0], coordinates[0][1]);
    // IMPORTANT: `circle.getBounds()` requires the circle to be on a map (`circle._map`).
    // This hook's effect can run before `drawnItemsRef` is added to the map, so compute bounds
    // without relying on the circle being attached to a map.
    const bounds = center.toBounds(radius * 2);

    if (bounds && lastDrawnBounds.current && lastDrawnBounds.current.south === bounds.getSouth() && lastDrawnBounds.current.west === bounds.getWest() && lastDrawnBounds.current.north === bounds.getNorth() && lastDrawnBounds.current.east === bounds.getEast()) {
      return; // Already drawn, skip
    }

    const circle = L.circle(center, {
      radius,
      color: '#3388ff',
      weight: 2,
      fillOpacity: 0.1,
      interactive: false,
    });

    drawnItemsRef.current.clearLayers();
    drawnItemsRef.current.addLayer(circle);
    lastDrawnBounds.current = {
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    };

    map.flyToBounds(bounds, { padding: [250, 250] });

    // Notify parent component to update visibility
    if (onVisibilityChangeRef.current) {
      onVisibilityChangeRef.current();
    }
  };

  const clearDrawnItems = () => {
    drawnItemsRef.current.clearLayers();
    lastDrawnBounds.current = null;

    // Notify parent component to update visibility
    if (onVisibilityChangeRef.current) {
      onVisibilityChangeRef.current();
    }
  };

  const addDrawnLayer = (layer: L.Layer) => {
    drawnItemsRef.current.clearLayers();
    drawnItemsRef.current.addLayer(layer);

    // Update last drawn bounds if it's a rectangle
    if ('getBounds' in layer && typeof layer.getBounds === 'function') {
      const bounds = layer.getBounds();

      lastDrawnBounds.current = {
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      };
    }

    // Notify parent component to update visibility
    if (onVisibilityChangeRef.current) {
      onVisibilityChangeRef.current();
    }
  };

  const setVisibilityChangeCallback = (callback: () => void) => {
    onVisibilityChangeRef.current = callback;
  };

  useEffect(() => {
    if (drawnShape && map) {
      if (drawnShape.kind === 'rectangle') {
        drawRectangleFromBounds({
          south: drawnShape.rect?.lat[0] ?? 0,
          west: drawnShape.rect?.lon[0] ?? 0,
          north: drawnShape.rect?.lat[1] ?? 0,
          east: drawnShape.rect?.lon[1] ?? 0,
        });
      } else if (drawnShape.kind === 'polygon') {
        drawPolygon(drawnShape.coordinates ?? []);
      } else if (drawnShape.kind === 'circle') {
        drawCircle(drawnShape.coordinates ?? [], drawnShape.radius ?? 0);
      }
    } else if (!drawnShape && map) {
      // Clear drawn items when drawnShape becomes null
      clearDrawnItems();
    }
  }, [drawnShape, map, clearDrawnItems]);

  return {
    drawnItemsRef,
    drawRectangleFromBounds,
    clearDrawnItems,
    addDrawnLayer,
    setVisibilityChangeCallback,
    isDrawingFromState: !!drawnShape,
  };
};
