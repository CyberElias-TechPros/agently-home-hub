import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Search, SlidersHorizontal } from 'lucide-react';
import PropertyCard from '@/components/PropertyCard';
import { mockProperties } from '@/lib/mockData';
import { Property } from '@/types';

export default function Properties() {
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyType, setPropertyType] = useState<string>('all');
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [showFilters, setShowFilters] = useState(false);

  const filteredProperties = mockProperties.filter((property: Property) => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.location.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = propertyType === 'all' || property.type === propertyType;
    const matchesPrice = property.price >= priceRange[0] && property.price <= priceRange[1];
    
    return matchesSearch && matchesType && matchesPrice;
  });

  return (
    <div className="min-h-screen py-8 pb-20 md:pb-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Properties</h1>
          <p className="text-muted-foreground">
            Showing {filteredProperties.length} of {mockProperties.length} properties
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by city, neighborhood, or property name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  <Select value={propertyType} onValueChange={setPropertyType}>
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
                    Price Range: ${priceRange[0]} - ${priceRange[1]}/month
                  </Label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={5000}
                    step={100}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPropertyType('all');
                    setPriceRange([0, 5000]);
                    setSearchTerm('');
                  }}
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
        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
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
              onClick={() => {
                setPropertyType('all');
                setPriceRange([0, 5000]);
                setSearchTerm('');
              }}
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
