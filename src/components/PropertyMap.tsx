import { useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { formatMoneyCompact } from '@/lib/format';
import type { PropertySummary } from '@/lib/api/types';

interface Props {
  properties: PropertySummary[];
  /** Coordinates for the initial view; defaults to mainland Lagos. */
  center?: [number, number];
  zoom?: number;
}

// Leaflet ships no default marker images when bundled, so the marker is a
// styled div instead. That also removes two image requests from the page.
const markerIcon = L.divIcon({
  className: 'agently-map-marker',
  html: `<span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:hsl(210 85% 45%);color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.3);font-size:12px;font-weight:700"></span>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

/**
 * Map view of a set of search results.
 *
 * Only properties with coordinates are plotted — inventing a location for a
 * listing without one would put the pin in the wrong place, which is worse than
 * showing no pin. The list view remains authoritative for those results.
 */
export function PropertyMap({ properties, center, zoom = 12 }: Props) {
  const plotted = useMemo(
    () =>
      properties.filter(
        (property) =>
          property.latitude !== null &&
          property.longitude !== null &&
          Number.isFinite(property.latitude) &&
          Number.isFinite(property.longitude)
      ),
    [properties]
  );

  const initialCenter = useMemo<[number, number]>(() => {
    if (center) return center;
    if (plotted.length > 0) {
      const [first] = plotted;
      return [first.latitude as number, first.longitude as number];
    }
    return [6.5244, 3.3792]; // Lagos
  }, [center, plotted]);

  return (
    <div className="relative overflow-hidden rounded-lg border">
      <MapContainer
        center={initialCenter}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-[560px] w-full"
        // Re-centre when the result set changes rather than recreating the map.
        key={`${initialCenter[0]},${initialCenter[1]}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {plotted.map((property) => (
          <Marker
            key={property.id}
            position={[property.latitude as number, property.longitude as number]}
            icon={markerIcon}
          >
            <Popup>
              <Link to={`/properties/${property.slug || property.id}`} className="block w-44">
                {property.images[0] && (
                  <img src={property.images[0]} alt="" className="mb-2 h-20 w-full rounded object-cover" />
                )}
                <span className="block text-sm font-semibold">
                  {formatMoneyCompact(property.price, property.currency)}
                </span>
                <span className="block truncate text-xs">{property.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {property.city}, {property.state}
                </span>
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {plotted.length < properties.length && (
        <p className="absolute bottom-3 left-3 z-[500] flex items-center gap-1.5 rounded-md bg-background/90 px-2.5 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {properties.length - plotted.length} listing
          {properties.length - plotted.length === 1 ? '' : 's'} without a location are not shown
        </p>
      )}
    </div>
  );
}

export default PropertyMap;
