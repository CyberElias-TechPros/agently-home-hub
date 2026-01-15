import { useState } from 'react';
import { Property } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Bed, Bath, Square, Heart, Shield, Zap, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const { toast } = useToast();

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Prevent card click

    setIsFavorited(!isFavorited);
    toast({
      title: isFavorited ? "Removed from favorites" : "Added to favorites",
      description: `${property.title} has been ${isFavorited ? "removed from" : "added to"} your favorites.`,
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group h-full flex flex-col">
      <div className="relative aspect-[4/3] sm:aspect-[16/9] overflow-hidden">
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Agently Trust & Verification Badges */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1">
          <Badge className="bg-gradient-hero text-white text-xs px-2 py-1 rounded-full">
            <Shield className="h-3 w-3 mr-1" />
            Verified
          </Badge>
          <Badge className="bg-gradient-accent text-white text-xs px-2 py-1 rounded-full">
            <Zap className="h-3 w-3 mr-1" />
            AI-Priced
          </Badge>
        </div>
        
        <Button
          size="icon"
          variant="secondary"
          className={`absolute top-2 right-2 sm:top-3 sm:right-3 rounded-full w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
            isFavorited ? 'text-red-500 bg-red-50' : ''
          }`}
          onClick={handleFavoriteToggle}
        >
          <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${isFavorited ? 'fill-current' : ''}`} />
        </Button>
        
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur text-xs">
            {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
          </Badge>
        </div>
        
        {/* Agently Features Overlay */}
        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex gap-1">
          {property.priceChange !== undefined && (
            <Badge variant="outline" className="bg-white/90 text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              {property.priceChange}% ROI
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-base sm:text-lg line-clamp-1 flex-1 mr-2">{property.title}</h3>
          <div className="text-right flex-shrink-0">
            <div className="text-xl sm:text-2xl font-bold text-primary">${property.price}</div>
            <div className="text-xs text-muted-foreground">/month</div>
          </div>
        </div>

        <div className="flex items-center text-xs sm:text-sm text-muted-foreground mb-2">
          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
          <span className="line-clamp-1">
            {property.location.city}, {property.location.state}
          </span>
        </div>

        {/* Agently Smart Features */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            🎯 AI Matched
          </Badge>
          <Badge variant="outline" className="text-xs">
            💰 Installments Available
          </Badge>
          <Badge variant="outline" className="text-xs">
            🛡️ Escrow Protected
          </Badge>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3 flex-wrap">
          {property.bedrooms > 0 && (
            <div className="flex items-center gap-1">
              <Bed className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{property.bedrooms} bed</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Bath className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{property.bathrooms} bath</span>
          </div>
          <div className="flex items-center gap-1">
            <Square className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{property.area} sqft</span>
            <span className="sm:hidden">{property.area}sq</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 flex-1">
          {property.description}
        </p>
        
        {/* Agently Value Proposition */}
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-gradient-hero rounded-full"></span>
            <span>Agently Verified</span>
          </span>
          <span className="text-xs font-medium text-primary">Smart Pricing</span>
        </div>
      </CardContent>

      <CardFooter className="p-3 sm:p-4 pt-0 mt-auto">
        <Link to={`/properties/${property.id}`} className="w-full">
          <Button className="w-full h-9 sm:h-10 text-sm bg-gradient-hero hover:opacity-90 text-white shadow-lg">
            🏠 Explore Property
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
