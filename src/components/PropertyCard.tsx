import { Property } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Bed, Bath, Square, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {property.featured && (
          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">
            Featured
          </Badge>
        )}
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-3 right-3 rounded-full"
        >
          <Heart className="h-4 w-4" />
        </Button>
        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur">
            {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">${property.price}</div>
            <div className="text-xs text-muted-foreground">/month</div>
          </div>
        </div>

        <div className="flex items-center text-sm text-muted-foreground mb-3">
          <MapPin className="h-4 w-4 mr-1" />
          <span className="line-clamp-1">
            {property.location.city}, {property.location.state}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          {property.bedrooms > 0 && (
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{property.bedrooms} bed</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            <span>{property.bathrooms} bath</span>
          </div>
          <div className="flex items-center gap-1">
            <Square className="h-4 w-4" />
            <span>{property.area} sqft</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {property.description}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Link to={`/properties/${property.id}`} className="w-full">
          <Button className="w-full">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
