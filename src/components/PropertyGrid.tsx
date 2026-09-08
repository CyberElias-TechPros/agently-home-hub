import { PropertyCard } from '@/components/PropertyCard';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchX } from 'lucide-react';
import type { PropertySummary } from '@/lib/api/types';

interface Props {
  properties: PropertySummary[];
  isLoading?: boolean;
  emptyMessage?: string;
}

/** Shared results layout so search, landlord and dashboard listings look alike. */
export function PropertyGrid({ properties, isLoading, emptyMessage }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[4/3] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <SearchX className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
        <p className="font-medium">No properties found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {emptyMessage ?? 'Try widening your search — remove a filter or look in a nearby city.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
