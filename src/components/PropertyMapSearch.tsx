import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle, Rectangle } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Filter,
  MapPin,
  Home,
  Bed,
  Bath,
  Square,
  DollarSign,
  Navigation,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Star,
  Heart,
  Share2,
  Phone,
  Mail
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Property {
  id: string;
  title: string;
  description: string;
  type: string;
  price: number;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: { lat: number; lng: number };
  };
  images: string[];
  bedrooms: number;
  bathrooms: number;
  area: number;
  amenities: string[];
  status: string;
  landlordId: string;
  availableFrom: string;
  featured?: boolean;
  landlord_name?: string;
  landlord_email?: string;
  landlord_phone?: string;
  price_per_sqft?: number;
  days_on_market?: number;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface PropertyMapSearchProps {
  onPropertySelect?: (property: Property) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  height?: string;
}

// Custom marker component
function PropertyMarker({ property, onSelect }: { property: Property; onSelect: (property: Property) => void }) {
  const [icon, setIcon] = useState<L.DivIcon>();

  useEffect(() => {
    const customIcon = L.divIcon({
      html: `
        <div class="relative">
          <div class="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
            </svg>
          </div>
          <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 rotate-45"></div>
          ${property.featured ? '<div class="absolute -top-1 -right-1 bg-yellow-400 rounded-full w-3 h-3 border border-white"></div>' : ''}
        </div>
      `,
      className: 'custom-marker',
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -40],
    });
    setIcon(customIcon);
  }, [property.featured]);

  if (!icon) return null;

  return (
    <Marker
      position={[property.location.coordinates.lat, property.location.coordinates.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(property),
      }}
    >
      <Popup>
        <div className="p-2 min-w-64">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-sm line-clamp-1">{property.title}</h3>
            {property.featured && (
              <Badge className="text-xs">Featured</Badge>
            )}
          </div>
          
          <div className="text-lg font-bold text-blue-600 mb-2">
            ${property.price.toLocaleString()}/mo
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-2">
            <div className="flex items-center gap-1">
              <Bed className="w-3 h-3" />
              {property.bedrooms}
            </div>
            <div className="flex items-center gap-1">
              <Bath className="w-3 h-3" />
              {property.bathrooms}
            </div>
            <div className="flex items-center gap-1">
              <Square className="w-3 h-3" />
              {property.area}ft²
            </div>
          </div>
          
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {property.description}
          </p>
          
          <div className="text-xs text-gray-500 mb-2">
            {property.location.address}, {property.location.city}
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 text-xs">
              View Details
            </Button>
            <Button size="sm" variant="outline" className="text-xs">
              <Heart className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Map events handler component
function MapEventsHandler({ onBoundsChange, onLocationSelect }: {
  onBoundsChange: (bounds: MapBounds) => void;
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    moveend: (e) => {
      const bounds = e.target.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    },
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export default function PropertyMapSearch({
  onPropertySelect,
  initialCenter = [37.7749, -122.4194], // San Francisco
  initialZoom = 12,
  height = '600px'
}: PropertyMapSearchProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [searchRadius, setSearchRadius] = useState(5); // miles
  const [showFilters, setShowFilters] = useState(false);
  const [showPropertyList, setShowPropertyList] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialCenter);
  const [mapZoom, setMapZoom] = useState(initialZoom);
  
  const [filters, setFilters] = useState({
    type: 'all',
    minPrice: '',
    maxPrice: '',
    minBedrooms: '',
    maxBedrooms: '',
    minBathrooms: '',
    maxBathrooms: '',
    amenities: [] as string[],
    featured: false,
    available: true
  });

  const mapRef = useRef<L.Map>(null);
  const { toast } = useToast();

  // Fetch properties within map bounds
  const fetchPropertiesInBounds = useCallback(async (bounds: MapBounds) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        north: bounds.north.toString(),
        south: bounds.south.toString(),
        east: bounds.east.toString(),
        west: bounds.west.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => 
            value !== '' && value !== 'all' && 
            (!Array.isArray(value) || value.length > 0)
          )
        )
      });

      const response = await fetch(`/api/search/properties/map?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties || []);
        setFilteredProperties(data.properties || []);
      } else {
        throw new Error('Failed to fetch properties');
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch properties in map area',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  // Handle bounds change
  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
    fetchPropertiesInBounds(bounds);
  }, [fetchPropertiesInBounds]);

  // Handle property selection
  const handlePropertySelect = useCallback((property: Property) => {
    setSelectedProperty(property);
    onPropertySelect?.(property);
    
    // Center map on property
    setMapCenter([property.location.coordinates.lat, property.location.coordinates.lng]);
    setMapZoom(15);
  }, [onPropertySelect]);

  // Handle location selection on map
  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    // You could add a temporary marker or search for properties near this location
    console.log('Selected location:', lat, lng);
  }, []);

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = properties;

    if (filters.type !== 'all') {
      filtered = filtered.filter(p => p.type === filters.type);
    }

    if (filters.minPrice) {
      filtered = filtered.filter(p => p.price >= parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(p => p.price <= parseFloat(filters.maxPrice));
    }

    if (filters.minBedrooms) {
      filtered = filtered.filter(p => p.bedrooms >= parseInt(filters.minBedrooms));
    }

    if (filters.maxBedrooms) {
      filtered = filtered.filter(p => p.bedrooms <= parseInt(filters.maxBedrooms));
    }

    if (filters.minBathrooms) {
      filtered = filtered.filter(p => p.bathrooms >= parseFloat(filters.minBathrooms));
    }

    if (filters.maxBathrooms) {
      filtered = filtered.filter(p => p.bathrooms <= parseFloat(filters.maxBathrooms));
    }

    if (filters.amenities.length > 0) {
      filtered = filtered.filter(p => 
        filters.amenities.some(amenity => p.amenities.includes(amenity))
      );
    }

    if (filters.featured) {
      filtered = filtered.filter(p => p.featured);
    }

    setFilteredProperties(filtered);
  }, [properties, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          setMapZoom(14);
          
          toast({
            title: 'Location Found',
            description: 'Map centered on your current location',
          });
        },
        (error) => {
          toast({
            title: 'Location Error',
            description: 'Unable to get your current location',
            variant: 'destructive'
          });
        }
      );
    } else {
      toast({
        title: 'Location Not Supported',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Map controls
  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  const handleFitBounds = useCallback(() => {
    if (mapRef.current && filteredProperties.length > 0) {
      const bounds = L.latLngBounds(
        filteredProperties.map(p => [p.location.coordinates.lat, p.location.coordinates.lng])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [filteredProperties]);

  return (
    <div className="flex h-full">
      {/* Map Container */}
      <div className="flex-1 relative" style={{ height }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapEventsHandler
            onBoundsChange={handleBoundsChange}
            onLocationSelect={handleLocationSelect}
          />
          
          {/* Property Markers */}
          {filteredProperties.map((property) => (
            <PropertyMarker
              key={property.id}
              property={property}
              onSelect={handlePropertySelect}
            />
          ))}
          
          {/* Search Radius Circle (if enabled) */}
          {mapBounds && searchRadius > 0 && (
            <Circle
              center={mapCenter}
              radius={searchRadius * 1609.34} // Convert miles to meters
              fillColor="blue"
              fillOpacity={0.1}
              color="blue"
              weight={2}
            />
          )}
        </MapContainer>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 z-10 space-y-2">
          <div className="bg-white rounded-lg shadow-lg p-2 space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="w-full"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="w-full"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Separator />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFitBounds}
              className="w-full"
              title="Fit all properties in view"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={getCurrentLocation}
              className="w-full"
              title="Center on your location"
            >
              <Navigation className="w-4 h-4" />
            </Button>
            <Separator />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPropertyList(!showPropertyList)}
              className="w-full"
              title="Toggle property list"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full"
              title="Toggle filters"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-white rounded-lg shadow-lg p-3 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Loading properties...</span>
            </div>
          </div>
        )}

        {/* Property Count */}
        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-white rounded-lg shadow-lg p-3">
            <div className="text-sm font-medium">
              {filteredProperties.length} properties found
            </div>
            {mapBounds && (
              <div className="text-xs text-gray-500">
                Map bounds: {mapBounds.north.toFixed(4)}, {mapBounds.west.toFixed(4)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property List Sidebar */}
      {showPropertyList && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium mb-2">Properties in Area</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {filteredProperties.length} found
              </Badge>
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            {filteredProperties.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Home className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No properties found in this area</p>
                <p className="text-sm mt-2">Try adjusting the map view or filters</p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredProperties.map((property) => (
                  <Card
                    key={property.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedProperty?.id === property.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handlePropertySelect(property)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm line-clamp-1 flex-1">
                          {property.title}
                        </h4>
                        {property.featured && (
                          <Badge className="text-xs ml-2">Featured</Badge>
                        )}
                      </div>
                      
                      <div className="text-lg font-bold text-blue-600 mb-2">
                        ${property.price.toLocaleString()}/mo
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Bed className="w-3 h-3" />
                          {property.bedrooms}
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="w-3 h-3" />
                          {property.bathrooms}
                        </div>
                        <div className="flex items-center gap-1">
                          <Square className="w-3 h-3" />
                          {property.area}ft²
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        {property.location.address}
                      </div>
                      
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="flex-1 text-xs">
                          <MapPin className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs">
                          <Heart className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="absolute top-20 right-4 z-10 w-80">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Property Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option value="all">All Types</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="studio">Studio</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Min Price</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minPrice}
                    onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Price</label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Min Bedrooms</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minBedrooms}
                    onChange={(e) => setFilters(prev => ({ ...prev, minBedrooms: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Bedrooms</label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={filters.maxBedrooms}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxBedrooms: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Min Bathrooms</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minBathrooms}
                    onChange={(e) => setFilters(prev => ({ ...prev, minBathrooms: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Bathrooms</label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={filters.maxBathrooms}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxBathrooms: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Search Radius (miles)</label>
                <Input
                  type="number"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={filters.featured}
                  onChange={(e) => setFilters(prev => ({ ...prev, featured: e.target.checked }))}
                />
                <label htmlFor="featured" className="text-sm">Featured only</label>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    type: 'all',
                    minPrice: '',
                    maxPrice: '',
                    minBedrooms: '',
                    maxBedrooms: '',
                    minBathrooms: '',
                    maxBathrooms: '',
                    amenities: [],
                    featured: false,
                    available: true
                  })}
                  className="flex-1"
                >
                  Clear
                </Button>
                <Button onClick={() => setShowFilters(false)} className="flex-1">
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
