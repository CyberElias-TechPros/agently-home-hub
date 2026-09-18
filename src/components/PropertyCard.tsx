import { useState } from 'react';
import { Property } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Bed, Bath, Square, Heart, Shield, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { resolveImage } from '@/lib/backend';

interface PropertyCardProps {
  property: Property;
  className?: string;
}

export default function PropertyCard({ property, className }: PropertyCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const { toast } = useToast();

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorited(!isFavorited);
    toast({
      title: isFavorited ? 'Removed from favorites' : 'Added to favorites',
      description: `${property.title} has been ${isFavorited ? 'removed from' : 'added to'} your favorites.`,
    });
  };

  const image = resolveImage(property.images?.[0]);

  return (
    <div className={`group card-cinematic ring-hover rounded-2xl overflow-hidden h-full flex flex-col ${className ?? ''}`}>
      <Link to={`/properties/${property.id}`} className="flex flex-col h-full">
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={image}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            <Badge className="glass-strong text-white border-0 gap-1">
              <Shield className="h-3 w-3 text-accent" /> Verified
            </Badge>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className={`absolute top-3 right-3 rounded-full w-9 h-9 glass-strong text-foreground transition-colors ${
              isFavorited ? 'text-red-400' : ''
            }`}
            onClick={handleFavoriteToggle}
          >
            <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
          </Button>

          {/* Price */}
          <div className="absolute bottom-3 left-3">
            <div className="font-display text-2xl font-bold text-white drop-shadow">
              ${property.price?.toLocaleString()}
              <span className="text-sm font-normal text-white/70"> /mo</span>
            </div>
          </div>
          <div className="absolute bottom-3 right-3">
            <Badge className="glass-strong text-white border-0 capitalize">{property.type}</Badge>
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <h3 className="font-display text-lg font-semibold line-clamp-1">{property.title}</h3>
          <div className="flex items-center text-sm text-muted-foreground mt-1.5">
            <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
            <span className="line-clamp-1">
              {property.location?.city}
              {property.location?.state ? `, ${property.location.state}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4 mb-4">
            {property.bedrooms > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Bed className="h-4 w-4" /> {property.bedrooms}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Bath className="h-4 w-4" /> {property.bathrooms}
            </span>
            {property.area > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Square className="h-4 w-4" /> {property.area.toLocaleString()}
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/60">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-accent" /> AI-priced
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              View <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
