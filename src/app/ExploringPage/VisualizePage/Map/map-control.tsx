import type { LatLng } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { useCallback, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import {
  setDrawnShape,
  setMapLayer,
  setSelectedGeohash,
  updateMapBounds,
} from '../../../../store/slices/exploring/mapSlice';
import { postZone, setZone } from '../../../../store/slices/exploring/zoneSlice';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { useMapDrawing } from './useMapDrawing';
import { resetZoneState } from '../../../../store/slices/exploring/zoneSlice';
import type { LatLon } from '../../../../shared/models/exploring/latlon.model';
import { geoPointsToGeoJsonPolygon, rectangleToGeoJsonPolygon } from '../../../../shared/utils/mapUtils';
import type { IZone } from '../../../../shared/models/exploring/zone.model';
import type { MapLayer } from '../../../../shared/models/exploring/dataset.model';

export const MapControl = ({ id }: { id: string }) => {
  const map = useMap();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { zone } = useAppSelector(state => state.zone);
  const { mapLayer, selectedGeohash, drawnShape } = useAppSelector(state => state.map);
  const { predictionDisplay } = useAppSelector(state => state.prediction);
  const hasInitialized = useRef(false);
  const layerControlRef = useRef<L.Control | null>(null);
  const layerControlContainerRef = useRef<HTMLDivElement | null>(null);
  const layerButtonsRef = useRef<{
    cluster?: HTMLAnchorElement;
    heatmap?: HTMLAnchorElement;
    geohash?: HTMLAnchorElement;
  }>({});

  const resetGeohashSelection = useCallback(() => {
    dispatch(setSelectedGeohash(null));
    navigate('?');
  }, [dispatch, navigate]);

  const toggleMapLayer = useCallback(
    (layer: MapLayer) => {
      if (layer !== 'geohash' && selectedGeohash != null) {
        resetGeohashSelection();
      }
      dispatch(setMapLayer(layer));
    },
    [dispatch, resetGeohashSelection, selectedGeohash],
  );

  // Use the custom hook for all drawing functionality
  const {
    drawnItemsRef,
    addDrawnLayer,
    clearDrawnItems,
    setVisibilityChangeCallback,
  } = useMapDrawing(map, id);

  useEffect(() => {
    if (!map) return;

    function onCreated(e: L.LeafletEvent) {
      const event = e as L.DrawEvents.Created;
      const layer = event.layer;

      // Use the hook's method to add the layer
      addDrawnLayer(layer);

      dispatch(resetZoneState());

      if (layer instanceof L.Rectangle && 'getBounds' in layer) {
        const bounds = layer.getBounds();

        dispatch(
          setDrawnShape({
            kind: 'rectangle',
            rect: {
              lat: [bounds.getSouth(), bounds.getNorth()],
              lon: [bounds.getWest(), bounds.getEast()],
            },
          }),
        );
      } else if (layer instanceof L.Polygon && 'getLatLngs' in layer) {
        const latLngs = layer.getLatLngs() as LatLng[][];
        const coordinates: LatLon[] = latLngs[0].map(latLng => [latLng.lat, latLng.lng]);

        dispatch(setDrawnShape({ kind: 'polygon', coordinates }));
      } else if (layer instanceof L.Circle && 'getRadius' in layer) {
        const radius = layer.getRadius();
        const bounds = layer.getBounds();

        dispatch(setDrawnShape({ kind: 'circle', coordinates: [[bounds.getCenter().lat, bounds.getCenter().lng]], radius }));
      }
    }

    function onDeleted() {
      dispatch(setDrawnShape(null));
    }

    function onMoveEnd() {
      const bounds = map.getBounds();

      dispatch(
        updateMapBounds({
          id,
          bounds: {
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast(),
          },
          zoom: map.getZoom(),
        }),
      );
    }

    if (!hasInitialized.current) {
      onMoveEnd();
      hasInitialized.current = true;
    }

    const drawnItems = drawnItemsRef.current;

    map.addLayer(drawnItems);

    // Custom drawing control with separate save/clear functionality
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        rectangle: { showArea: false }, // disable showArea
        polyline: false,
        polygon: { showArea: false },
        circle: { showRadius: true },
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        edit: false,
        remove: false, // Disable default remove control
      },
    });

    map.addControl(drawControl);

    // Custom save/clear control
    const saveClearControl = new L.Control({ position: 'topright' });

    saveClearControl.onAdd = function () {
      const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');

      div.style.marginTop = '10px';
      div.style.display = 'flex';
      div.style.flexDirection = 'column';
      div.style.gap = '2px';
      div.style.display = 'none'; // Initially hidden

      // Save button
      const saveButton = L.DomUtil.create('a', 'leaflet-control-save', div);

      saveButton.innerHTML = '💾';
      saveButton.title = 'Save drawn shape as zone';
      saveButton.style.width = '30px';
      saveButton.style.height = '30px';
      saveButton.style.lineHeight = '30px';
      saveButton.style.textAlign = 'center';
      saveButton.style.fontSize = '16px';
      saveButton.style.cursor = 'pointer';
      // saveButton.style.backgroundColor = '#4CAF50';
      saveButton.style.color = 'white';
      saveButton.style.border = 'none';
      saveButton.style.borderRadius = '4px';

      // Disable saveButton if zone rectangle is drawn
      if (zone?.id) {
        saveButton.setAttribute('disabled', 'true');
        saveButton.style.opacity = '0.5';
        saveButton.style.pointerEvents = 'none';
      } else {
        saveButton.removeAttribute('disabled');
        saveButton.style.opacity = '1';
        saveButton.style.pointerEvents = 'auto';
      }

      // Clear button
      const clearButton = L.DomUtil.create('a', 'leaflet-control-clear', div);

      clearButton.innerHTML = '✖️';
      clearButton.title = 'Clear drawn shape';
      clearButton.style.width = '30px';
      clearButton.style.height = '30px';
      clearButton.style.lineHeight = '30px';
      clearButton.style.textAlign = 'center';
      clearButton.style.fontSize = '16px';
      clearButton.style.cursor = 'pointer';
      // clearButton.style.backgroundColor = '#f44336';
      clearButton.style.color = 'white';
      clearButton.style.border = 'none';
      clearButton.style.borderRadius = '4px';

      // Function to show/hide the control based on drawn layers
      const updateControlVisibility = () => {
        // Use the hook's drawnItemsRef instead of the local drawnItems variable
        const layers = drawnItemsRef.current.getLayers();

        div.style.display = layers.length > 0 ? 'flex' : 'none';
      };

      // Save functionality
      saveButton.onclick = function () {
        const layers = drawnItems.getLayers();

        if (layers.length > 0) {
          const layer = layers[0];

          let zone = {} as IZone;

          if (layer instanceof L.Rectangle && 'getBounds' in layer && typeof layer.getBounds === 'function') {
            const bounds = layer.getBounds();

            // Create zone object from bounds
            zone = {
              fileName: id, // Use dataset ID as filename
              name: `Drawn Rectangle ${new Date().toLocaleString()}`,
              feature: {
                type: 'Feature' as const,
                geometry: rectangleToGeoJsonPolygon({
                  lat: [bounds.getSouth(), bounds.getNorth()],
                  lon: [bounds.getWest(), bounds.getEast()],
                }),
              },
            };
          } else if (layer instanceof L.Polygon && 'getLatLngs' in layer && typeof layer.getLatLngs === 'function') {
            const latLngs = layer.getLatLngs() as LatLng[][];
            const coordinates: LatLon[] = latLngs[0].map(latLng => [latLng.lat, latLng.lng]);

            // Create zone object from coordinates
            zone = {
              fileName: id, // Use dataset ID as filename
              name: `Drawn Polygon ${new Date().toLocaleString()}`,
              feature: {
                type: 'Feature' as const,
                geometry: geoPointsToGeoJsonPolygon(coordinates),
              },
            };
          } else if (layer instanceof L.Circle && 'getRadius' in layer && typeof layer.getRadius === 'function') {
            const radius = layer.getRadius();
            const bounds = layer.getBounds();

            // Create zone object from coordinates
            zone = {
              fileName: id, // Use dataset ID as filename
              name: `Drawn Circle ${new Date().toLocaleString()}`,
              feature: {
                type: 'Feature' as const,
                geometry: {
                  type: 'Point' as const,
                  coordinates: [bounds.getCenter().lng, bounds.getCenter().lat] as [number, number],
                },
                properties: {
                  radius: radius,
                  shape: 'circle',
                }
              },
            };
          }

          dispatch(postZone(zone));

          // Keep the drawn shape visible (don't clear it) if zone is saved successfully
        }
      };

      // Clear functionality
      clearButton.onclick = function () {
        // Use the hook's clear method
        clearDrawnItems();
        dispatch(setDrawnShape(null));
        if (zone?.id) {
          dispatch(setZone({}));
        }
        updateControlVisibility(); // Hide the control after clearing
      };

      // Store the update function on the control for external access
      (
        saveClearControl as L.Control & { updateVisibility?: () => void }
      ).updateVisibility = updateControlVisibility;

      // Set up the visibility change callback from the hook
      setVisibilityChangeCallback(updateControlVisibility);

      // Initial visibility check
      updateControlVisibility();

      return div;
    };

    map.addControl(saveClearControl);

    // Create wrapper functions that show/hide the control
    const onCreatedWrapper = (e: L.LeafletEvent) => {
      onCreated(e);
      // Show the save/clear control after drawing
      const control = saveClearControl as L.Control & {
        updateVisibility?: () => void;
      };

      if (control.updateVisibility) {
        control.updateVisibility();
      }
    };

    const onDeletedWrapper = (e: L.LeafletEvent) => {
      onDeleted();
      // Hide the save/clear control after deletion
      const control = saveClearControl as L.Control & {
        updateVisibility?: () => void;
      };

      if (control.updateVisibility) {
        control.updateVisibility();
      }
    };

    map.on(L.Draw.Event.CREATED, onCreatedWrapper);
    map.on(L.Draw.Event.DELETED, onDeletedWrapper);
    map.on('moveend', onMoveEnd);

    return () => {
      map.removeLayer(drawnItems);
      map.removeControl(drawControl);
      map.removeControl(saveClearControl);
      map.off(L.Draw.Event.CREATED, onCreatedWrapper);
      map.off(L.Draw.Event.DELETED, onDeletedWrapper);
      map.off('moveend', onMoveEnd);
    };
  }, [map, id, dispatch, addDrawnLayer, clearDrawnItems]);

  useEffect(() => {
    if (!map) return;

    if (predictionDisplay) {
      if (layerControlRef.current) {
        map.removeControl(layerControlRef.current);
        layerControlRef.current = null;
      }
      layerControlContainerRef.current = null;
      layerButtonsRef.current = {};

      return;
    }

    if (!layerControlRef.current) {
      const layerControl = new L.Control({ position: 'topright' });

      layerControl.onAdd = () => {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');

        div.style.backgroundColor = 'white';
        div.style.border = '2px solid rgba(0,0,0,0.2)';
        div.style.borderRadius = '4px';

        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);

        const createButton = (
          value: MapLayer,
          iconSvg: string,
          title: string,
        ) => {
          const button = L.DomUtil.create('a', '', div) as HTMLAnchorElement;

          button.href = '#';
          button.title = title;
          button.setAttribute('role', 'button');
          button.setAttribute('aria-label', title);
          button.innerHTML = iconSvg;
          button.style.width = '30px';
          button.style.height = '30px';
          button.style.lineHeight = '30px';
          button.style.textAlign = 'center';
          button.style.display = 'block';
          button.style.color = 'black';
          button.style.textDecoration = 'none';
          button.style.fontWeight = '600';
          button.style.borderBottom = '1px solid rgba(0,0,0,0.2)';

          L.DomEvent.on(button, 'click', e => {
            L.DomEvent.preventDefault(e);
            if (value === 'geohash' && drawnShape != null) return;
            toggleMapLayer(value);
          });

          return button;
        };

        const clusterIconSvg =
          '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" style="vertical-align: middle;"><circle cx="12" cy="6" r="3" fill="currentColor"/><circle cx="6" cy="16" r="3" fill="currentColor"/><circle cx="18" cy="16" r="3" fill="currentColor"/></svg>';
        const heatmapIconSvg =
          '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" style="vertical-align: middle;"><path d="M5 14c0-4 3-7 7-7s7 3 7 7c0 3.9-3.1 6-7 6s-7-2.1-7-6z" fill="currentColor" opacity="0.35"/><path d="M7 14c0-3 2.4-5 5-5s5 2 5 5c0 2.7-2.2 4-5 4s-5-1.3-5-4z" fill="currentColor" opacity="0.2"/></svg>';
        const geohashIconSvg =
          '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" style="vertical-align: middle;"><path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" stroke-width="2" fill="none"/></svg>';

        const clusterButton = createButton('cluster', clusterIconSvg, 'Points');
        const heatmapButton = createButton('heatmap', heatmapIconSvg, 'Heatmap');
        const geohashButton = createButton('geohash', geohashIconSvg, 'Geohash');

        geohashButton.style.borderBottom = 'none';

        layerControlContainerRef.current = div;
        layerButtonsRef.current = {
          cluster: clusterButton,
          heatmap: heatmapButton,
          geohash: geohashButton,
        };

        return div;
      };

      layerControlRef.current = layerControl;
      map.addControl(layerControl);
    }

    return () => {
      if (layerControlRef.current) {
        map.removeControl(layerControlRef.current);
        layerControlRef.current = null;
      }
      layerControlContainerRef.current = null;
      layerButtonsRef.current = {};
    };
  }, [map, predictionDisplay, drawnShape, toggleMapLayer]);

  useEffect(() => {
    if (!layerControlContainerRef.current) return;

    const { cluster, heatmap, geohash } = layerButtonsRef.current;
    const setActive = (button?: HTMLAnchorElement, active?: boolean) => {
      if (!button) return;
      button.style.backgroundColor = active ? '#f4f4f4' : 'transparent';
    };

    setActive(cluster, mapLayer === 'cluster');
    setActive(heatmap, mapLayer === 'heatmap');
    setActive(geohash, mapLayer === 'geohash');

    if (geohash) {
      const isDisabled = drawnShape != null;

      geohash.style.opacity = isDisabled ? '0.5' : '1';
      geohash.style.pointerEvents = isDisabled ? 'none' : 'auto';
    }
  }, [drawnShape, mapLayer]);

  return null;
};
