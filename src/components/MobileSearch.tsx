import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  MapPin,
  Home,
  DollarSign,
  Bed,
  Bath,
  Square,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Navigation,
  Camera
} from 'lucide-react';

interface MobileSearchProps {
  onSearch: (filters: any) => void;
  onLocationSearch?: () => void;
  onCameraSearch?: () => void;
  className?: string;
}

interface SearchFilters {
  query: string;
  location: string;
  propertyType: string;
  priceRange: { min: number; max: number };
  bedrooms: number;
  bathrooms: number;
  area: { min: number; max: number };
  amenities: string[];
  petFriendly: boolean;
  furnished: boolean;
  parking: boolean;
}

export default function MobileSearch({ 
  onSearch, 
  onLocationSearch,
  onCameraSearch,
  className 
}: MobileSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    location: '',
    propertyType: 'all',
    priceRange: { min: 0, max: 5000 },
    bedrooms: 0,
    bathrooms: 0,
    area: { min: 0, max: 3000 },
    amenities: [],
    petFriendly: false,
    furnished: false,
    parking: false
  });

  const [showFilters, setShowFilters] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const propertyTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'condo', label: 'Condo' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'studio', label: 'Studio' }
  ];

  const commonAmenities = [
    'Parking', 'Gym', 'Pool', 'Pet-friendly', 'Laundry',
    'Doorman', 'Elevator', 'Balcony', 'Storage', 'AC'
  ];

  useEffect(() => {
    const count = [
      filters.propertyType !== 'all',
      filters.priceRange.min > 0 || filters.priceRange.max < 5000,
      filters.bedrooms > 0,
      filters.bathrooms > 0,
      filters.area.min > 0 || filters.area.max < 3000,
      filters.amenities.length > 0,
      filters.petFriendly,
      filters.furnished,
      filters.parking
    ].filter(Boolean).length;

    setActiveFilterCount(count);
  }, [filters]);

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleLocationSearch = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFilters(prev => ({
            ...prev,
            location: `${position.coords.latitude}, ${position.coords.longitude}`
          }));
          onLocationSearch?.();
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      location: '',
      propertyType: 'all',
      priceRange: { min: 0, max: 5000 },
      bedrooms: 0,
      bathrooms: 0,
      area: { min: 0, max: 3000 },
      amenities: [],
      petFriendly: false,
      furnished: false,
      parking: false
    });
  };

  const toggleAmenity = (amenity: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search properties..."
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="pl-10 pr-4"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLocationSearch}
              className="flex-1"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Near Me
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCameraSearch}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filters</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Location */}
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="City, neighborhood, or address"
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Property Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Property Type</label>
              <div className="grid grid-cols-2 gap-2">
                {propertyTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant={filters.propertyType === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, propertyType: type.value }))}
                    className="justify-start"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Price Range</label>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.priceRange.min || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      priceRange: { ...prev.priceRange, min: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
                <span className="text-gray-500">-</span>
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.priceRange.max || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      priceRange: { ...prev.priceRange, max: parseInt(e.target.value) || 5000 }
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Bedrooms & Bathrooms */}
            <div>
              <label className="text-sm font-medium mb-2 block">Bedrooms & Bathrooms</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Bedrooms</label>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((num) => (
                      <Button
                        key={num}
                        variant={filters.bedrooms === num ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, bedrooms: num }))}
                        className="flex-1"
                      >
                        {num === 0 ? 'Any' : num}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Bathrooms</label>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((num) => (
                      <Button
                        key={num}
                        variant={filters.bathrooms === num ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, bathrooms: num }))}
                        className="flex-1"
                      >
                        {num === 0 ? 'Any' : num}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Area */}
            <div>
              <label className="text-sm font-medium mb-2 block">Square Feet</label>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.area.min || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      area: { ...prev.area, min: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
                <span className="text-gray-500">-</span>
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.area.max || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      area: { ...prev.area, max: parseInt(e.target.value) || 3000 }
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="text-sm font-medium mb-2 block">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {commonAmenities.map((amenity) => (
                  <Button
                    key={amenity}
                    variant={filters.amenities.includes(amenity) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleAmenity(amenity)}
                  >
                    {amenity}
                  </Button>
                ))}
              </div>
            </div>

            {/* Additional Features */}
            <div>
              <label className="text-sm font-medium mb-2 block">Additional Features</label>
              <div className="space-y-2">
                {[
                  { key: 'petFriendly', label: 'Pet Friendly' },
                  { key: 'furnished', label: 'Furnished' },
                  { key: 'parking', label: 'Parking Available' }
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={filters[key as keyof SearchFilters] ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      [key]: !prev[key as keyof SearchFilters] 
                    }))}
                    className="w-full justify-start"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Apply Filters Button */}
            <Button onClick={handleSearch} className="w-full">
              Apply Filters ({activeFilterCount} active)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Mobile Search Suggestions
export function MobileSearchSuggestions({ 
  suggestions, 
  onSelect, 
  loading 
}: {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-2">
        <div className="space-y-1">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8"
              onClick={() => onSelect(suggestion)}
            >
              <Search className="h-3 w-3 mr-2" />
              {suggestion}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
