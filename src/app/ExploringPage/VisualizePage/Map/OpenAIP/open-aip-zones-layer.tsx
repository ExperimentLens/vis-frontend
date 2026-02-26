import { Marker, Polygon, Popup } from 'react-leaflet';
import { useAppSelector } from '../../../../../store/store';
import { MIN_ZOOM_FOR_OPENAIP_OVERLAY } from '../../../../../shared/utils/mapUtils';
import {
  OpenAipAirportTypes,
  type IOpenAipAirport,
} from '../../../../../shared/models/exploring/openaip/airport.model';
import type { IOpenAipAirspace } from '../../../../../shared/models/exploring/openaip/airspace.model';
import { BeautifyIcon } from '../../../../../shared/utils/beautify-marker/leaflet-beautify-marker-icon';
import { OpenAipAirspaceTypes } from '../../../../../shared/models/exploring/openaip/airspace.model';

const airportIcon = BeautifyIcon.icon({
  iconShape: 'circle',
  isAlphaNumericIcon: false,
  backgroundColor: 'rgba(212,62,42)',
  borderColor: '#ffffff',
  borderWidth: 2,
  iconSize: [18, 18],
});

const coordinatesToLatLngTuples = (
  coordinates: [number, number][][],
): [number, number][][] => {
  return coordinates.map(ring => ring.map(([lon, lat]) => [lat, lon]));
};

export const OpenAipZonesLayer = () => {
  const { zoom } = useAppSelector(state => state.map);
  const {
    enabled,
    showAirports,
    showAirspaces,
    airportsById,
    airspacesById,
    enabledAirspaceTypes,
    enabledAirportTypes,
  } = useAppSelector(state => state.openAip);

  if (!enabled || zoom < MIN_ZOOM_FOR_OPENAIP_OVERLAY) return null;

  const visibleAirspaces = showAirspaces
    ? Object.values(airspacesById).filter(
      airspace => enabledAirspaceTypes[airspace.type],
    )
    : [];
  const visibleAirports = showAirports
    ? Object.values(airportsById).filter(
      airport => enabledAirportTypes[airport.type],
    )
    : [];

  return (
    <>
      {visibleAirspaces.map((airspace: IOpenAipAirspace) => {
        const coordinates = coordinatesToLatLngTuples(
          airspace.geometry.coordinates,
        );
        const airspaceType =
          OpenAipAirspaceTypes[airspace.type] ?? OpenAipAirspaceTypes[0];

        return (
          <Polygon
            key={`airspace-${airspace._id}`}
            positions={coordinates}
            pathOptions={{
              color: airspaceType.color,
              weight: 2,
              opacity: 0.5,
              fillOpacity: 0.2,
            }}
          >
            <Popup className="openaip-popup">
              <div className="openaip-popup-card">
                <div className="openaip-popup-header">
                  <span
                    className="openaip-popup-color-dot"
                    style={{ backgroundColor: airspaceType.color }}
                  />
                  <span className="openaip-popup-title">{airspace.name}</span>
                </div>
                <div className="openaip-popup-row">
                  <span className="openaip-popup-label">Type</span>
                  <span className="openaip-popup-badge">
                    {airspaceType.label}
                  </span>
                </div>
                <div className="openaip-popup-row">
                  <span className="openaip-popup-label">Category ID</span>
                  <span className="openaip-popup-value">{airspace.type}</span>
                </div>
              </div>
            </Popup>
          </Polygon>
        );
      })}
      {visibleAirports.map((airport: IOpenAipAirport) => {
        const [lon, lat] = airport.geometry.coordinates;
        const airportType =
          OpenAipAirportTypes[airport.type] ?? OpenAipAirportTypes[0];

        return (
          <Marker
            key={`airport-${airport._id}`}
            position={[lat, lon]}
            icon={airportIcon}
          >
            <Popup className="openaip-popup">
              <div className="openaip-popup-card">
                <div className="openaip-popup-header">
                  <span
                    className="openaip-popup-color-dot"
                    style={{ backgroundColor: 'rgba(212,62,42)' }}
                  />
                  <span className="openaip-popup-title">{airport.name}</span>
                </div>
                <div className="openaip-popup-row">
                  <span className="openaip-popup-label">Type</span>
                  <span className="openaip-popup-badge">{airportType}</span>
                </div>
                <div className="openaip-popup-row">
                  <span className="openaip-popup-label">ICAO</span>
                  <span className="openaip-popup-value">
                    {airport.icaoCode ?? 'N/A'}
                  </span>
                </div>
                <div className="openaip-popup-row">
                  <span className="openaip-popup-label">IATA</span>
                  <span className="openaip-popup-value">
                    {airport.iataCode ?? 'N/A'}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};
