import { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Search, SlidersHorizontal, Loader2, MapPin, Bed, Bath, Square, Calendar, Star } from 'lucide-react';
import PropertyCard from '@/components/PropertyCard';
import { apiService } from '@/lib/api';
import { Property } from '@/types';
import { useToast } from '@/hooks/use-toast';
import AdContainer from '@/components/AdContainer';

interface SearchFilters {
  searchTerm: string;
  propertyType: string;
  priceRange: [number, number];
  bedrooms: number[];
  bathrooms: number[];
  amenities: string[];
  furnished: boolean | null;
  petFriendly: boolean | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();

  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    propertyType: 'all',
    priceRange: [0, 5000],
    bedrooms: [],
    bathrooms: [],
    amenities: [],
    furnished: null,
    petFriendly: null,
    sortBy: 'price',
    sortOrder: 'asc'
  });

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getProperties();
      setProperties(data);
    } catch (error) {
      toast({
        title: "Error loading properties",
        description: "Failed to load properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const filteredAndSortedProperties = useMemo(() => {
    let filtered = properties.filter((property: Property) => {
      // Search filter
      const matchesSearch = !filters.searchTerm || 
        property.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        property.location.city.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        property.location.state.toLowerCase().includes(filters.searchTerm.toLowerCase());

      // Property type filter
      const matchesType = filters.propertyType === 'all' || property.type === filters.propertyType;

      // Price range filter
      const matchesPrice = property.price >= filters.priceRange[0] && property.price <= filters.priceRange[1];

      // Bedrooms filter
      const matchesBedrooms = filters.bedrooms.length === 0 || filters.bedrooms.includes(property.bedrooms);

      // Bathrooms filter
      const matchesBathrooms = filters.bathrooms.length === 0 || 
        filters.bathrooms.some(b => property.bathrooms >= b);

      // Amenities filter
      const matchesAmenities = filters.amenities.length === 0 || 
        filters.amenities.every(amenity => property.amenities.includes(amenity));

      // Furnished filter
      const matchesFurnished = filters.furnished === null || 
        (filters.furnished && property.amenities.includes('Furnished')) ||
        (!filters.furnished && !property.amenities.includes('Furnished'));

      // Pet friendly filter
      const matchesPetFriendly = filters.petFriendly === null ||
        (filters.petFriendly && property.amenities.includes('Pet-friendly')) ||
        (!filters.petFriendly && !property.amenities.includes('Pet-friendly'));

      return matchesSearch && matchesType && matchesPrice && matchesBedrooms && 
             matchesBathrooms && matchesAmenities && matchesFurnished && matchesPetFriendly;
    });

    // Sort properties
    const sorted = [...filtered].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (filters.sortBy) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'bedrooms':
          aValue = a.bedrooms;
          bValue = b.bedrooms;
          break;
        case 'area':
          aValue = a.area;
          bValue = b.area;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          aValue = a.price;
          bValue = b.price;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return filters.sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return filters.sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return sorted;
  }, [properties, filters]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleBedroomFilter = (bedrooms: number) => {
    setFilters(prev => ({
      ...prev,
      bedrooms: prev.bedrooms.includes(bedrooms)
        ? prev.bedrooms.filter(b => b !== bedrooms)
        : [...prev.bedrooms, bedrooms]
    }));
  };

  const toggleBathroomFilter = (bathrooms: number) => {
    setFilters(prev => ({
      ...prev,
      bathrooms: prev.bathrooms.includes(bathrooms)
        ? prev.bathrooms.filter(b => b !== bathrooms)
        : [...prev.bathrooms, bathrooms]
    }));
  };

  const toggleAmenityFilter = (amenity: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      propertyType: 'all',
      priceRange: [0, 5000],
      bedrooms: [],
      bathrooms: [],
      amenities: [],
      furnished: null,
      petFriendly: null,
      sortBy: 'price',
      sortOrder: 'asc'
    });
  };

  const activeFilterCount = [
    filters.searchTerm,
    filters.propertyType !== 'all',
    filters.priceRange[0] > 0 || filters.priceRange[1] < 5000,
    filters.bedrooms.length,
    filters.bathrooms.length,
    filters.amenities.length,
    filters.furnished !== null,
    filters.petFriendly !== null
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen py-8 pb-20 md:pb-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Properties</h1>
          <p className="text-muted-foreground">
            {loading ? 'Loading properties...' : `Showing ${filteredAndSortedProperties.length} of ${properties.length} properties`}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by city, neighborhood, or property name..."
                value={filters.searchTerm}
                onChange={(e) => updateFilter('searchTerm', e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-card p-6 rounded-lg border animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="property-type" className="mb-2 block">Property Type</Label>
                  <Select value={filters.propertyType} onValueChange={(value) => updateFilter('propertyType', value)}>
                    <SelectTrigger id="property-type">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label className="mb-4 block">
                    Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}/month
                  </Label>
                  <Select
                    value={filters.propertyType}
                    onValueChange={(value) => updateFilter('propertyType', value)}
                  >
                    <SelectTrigger id="property-type">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
                <Button onClick={() => setShowFilters(false)}>
                  Apply Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Properties Grid */}
        <AdContainer pageType="properties" position="top" className="mb-8" />
        
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredAndSortedProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground mb-4">
              No properties found matching your criteria
            </p>
            <Button
              variant="outline"
              onClick={clearFilters}
            >
              Clear All Filters
            </Button>
          </div>
        )}
        
        <AdContainer pageType="properties" position="bottom" />
      </div>
    </div>
  );
}
