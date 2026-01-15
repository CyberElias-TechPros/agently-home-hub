import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Heart,
  Share2,
  MapPin,
  Bed,
  Bath,
  Square,
  Calendar,
  Star,
  Phone,
  MessageSquare,
  ChevronRight,
  Camera,
  Navigation
} from 'lucide-react';

interface MobilePropertyCardProps {
  property: {
    id: string;
    title: string;
    description: string;
    price: number;
    location: {
      address: string;
      city: string;
      state: string;
      coordinates?: { lat: number; lng: number };
    };
    images: string[];
    bedrooms: number;
    bathrooms: number;
    area: number;
    amenities: string[];
    status: string;
    availableFrom?: string;
    featured?: boolean;
    landlord?: {
      name: string;
      rating: number;
      phone?: string;
    };
  };
  onFavorite?: (propertyId: string) => void;
  onShare?: (property: any) => void;
  onViewDetails?: (propertyId: string) => void;
  onContact?: (propertyId: string) => void;
  onGetDirections?: (coordinates: { lat: number; lng: number }) => void;
  className?: string;
}

export default function MobilePropertyCard({
  property,
  onFavorite,
  onShare,
  onViewDetails,
  onContact,
  onGetDirections,
  className
}: MobilePropertyCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
    onFavorite?.(property.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(property);
  };

  const handleViewDetails = () => {
    onViewDetails?.(property.id);
  };

  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    onContact?.(property.id);
  };

  const handleGetDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (property.location.coordinates) {
      onGetDirections?.(property.location.coordinates);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'rented': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={cn("overflow-hidden hover:shadow-lg transition-shadow", className)}>
      {/* Image Section */}
      <div className="relative h-48 sm:h-56">
        <img
          src={property.images[imageIndex] || '/placeholder-property.jpg'}
          alt={property.title}
          className="w-full h-full object-cover"
        />
        
        {/* Image Indicators */}
        {property.images.length > 1 && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {property.images.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full bg-white/50",
                  index === imageIndex && "bg-white"
                )}
              />
            ))}
          </div>
        )}

        {/* Image Actions */}
        <div className="absolute top-2 right-2 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-white/90 backdrop-blur-sm"
            onClick={handleFavorite}
          >
            <Heart 
              className={cn(
                "h-4 w-4",
                isFavorited ? "fill-red-500 text-red-500" : "text-gray-600"
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-white/90 backdrop-blur-sm"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4 text-gray-600" />
          </Button>
        </div>

        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <Badge className={cn("text-xs", getStatusColor(property.status))}>
            {property.status}
          </Badge>
        </div>

        {/* Featured Badge */}
        {property.featured && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs">
              Featured
            </Badge>
          </div>
        )}

        {/* Camera Icon */}
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1">
          <Camera className="h-3 w-3 text-gray-600" />
          <span className="text-xs text-gray-600 ml-1">{property.images.length}</span>
        </div>
      </div>

      {/* Content Section */}
      <CardContent className="p-4">
        {/* Price and Status */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(property.price)}
              <span className="text-sm text-gray-500 font-normal">/month</span>
            </div>
            <div className="text-sm text-gray-500">
              {formatCurrency(Math.round(property.price / property.area))}/sqft
            </div>
          </div>
          {property.landlord?.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">{property.landlord.rating}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
          <MapPin className="h-3 w-3" />
          <span className="line-clamp-1">
            {property.location.address}, {property.location.city}
          </span>
        </div>

        {/* Property Specs */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            <span>{property.bedrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            <span>{property.bathrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Square className="h-4 w-4" />
            <span>{property.area} sqft</span>
          </div>
        </div>

        {/* Amenities */}
        {property.amenities && property.amenities.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {property.amenities.slice(0, 3).map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
              {property.amenities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{property.amenities.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Available Date */}
        {property.availableFrom && (
          <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
            <Calendar className="h-3 w-3" />
            <span>Available from {new Date(property.availableFrom).toLocaleDateString()}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={handleViewDetails}
          >
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={handleContact}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            
            {property.location.coordinates && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={handleGetDirections}
              >
                <Navigation className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mobile Property List Component
export function MobilePropertyList({ 
  properties, 
  loading,
  onPropertyClick,
  onFavorite,
  onShare,
  onContact,
  onGetDirections
}: {
  properties: any[];
  loading?: boolean;
  onPropertyClick?: (propertyId: string) => void;
  onFavorite?: (propertyId: string) => void;
  onShare?: (property: any) => void;
  onContact?: (propertyId: string) => void;
  onGetDirections?: (coordinates: { lat: number; lng: number }) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <div className="h-48 bg-gray-200 animate-pulse" />
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <MapPin className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No properties found</h3>
        <p className="text-gray-500">Try adjusting your search criteria</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {properties.map((property) => (
        <MobilePropertyCard
          key={property.id}
          property={property}
          onFavorite={onFavorite}
          onShare={onShare}
          onViewDetails={onPropertyClick}
          onContact={onContact}
          onGetDirections={onGetDirections}
        />
      ))}
    </div>
  );
}
