import { Bath, BedDouble, MapPin, Ruler } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatMoneyCompact, propertyTypeLabel } from '@/lib/format';
import type { PropertySummary } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface PropertyCardProps {
  property: PropertySummary;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-success/10 text-success-foreground border-success/20',
  occupied: 'bg-muted text-muted-foreground',
  maintenance: 'bg-warning/10 text-warning-foreground border-warning/20',
  draft: 'bg-muted text-muted-foreground',
  unavailable: 'bg-muted text-muted-foreground',
};

export function PropertyCard({ property, className }: PropertyCardProps) {
  const cover = property.images[0];

  return (
    <Card className={cn('group h-full overflow-hidden transition-shadow hover:shadow-lg', className)}>
      <Link to={`/properties/${property.slug || property.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {cover ? (
            <img
              src={cover}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <MapPin className="h-8 w-8" aria-hidden="true" />
              <span className="sr-only">No photo available</span>
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur">
              {propertyTypeLabel(property.type)}
            </Badge>
            {property.status !== 'available' && (
              <Badge variant="outline" className={cn('bg-background/90 capitalize backdrop-blur', STATUS_STYLES[property.status])}>
                {property.status}
              </Badge>
            )}
          </div>
          {property.featured && (
            <Badge className="absolute right-3 top-3 bg-accent text-accent-foreground">Featured</Badge>
          )}
        </div>

        <CardContent className="p-4">
          <p className="text-lg font-semibold leading-tight">
            {formatMoneyCompact(property.price, property.currency)}
            <span className="text-sm font-normal text-muted-foreground">/year</span>
          </p>
          <h3 className="mt-1 truncate font-medium text-foreground">{property.title}</h3>
          <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {property.city}, {property.state}
          </p>

          <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <BedDouble className="h-4 w-4" aria-hidden="true" />
              <dt className="sr-only">Bedrooms</dt>
              <dd>{property.bedrooms} bed{property.bedrooms === 1 ? '' : 's'}</dd>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" aria-hidden="true" />
              <dt className="sr-only">Bathrooms</dt>
              <dd>{property.bathrooms} bath{property.bathrooms === 1 ? '' : 's'}</dd>
            </div>
            {property.area_sqft !== null && (
              <div className="flex items-center gap-1">
                <Ruler className="h-4 w-4" aria-hidden="true" />
                <dt className="sr-only">Floor area</dt>
                <dd>{property.area_sqft.toLocaleString('en-NG')} sqft</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Link>
    </Card>
  );
}

export default PropertyCard;
