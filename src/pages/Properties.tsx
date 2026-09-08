import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PropertyGrid } from '@/components/PropertyGrid';
import { lazy, Suspense } from 'react';

// Leaflet is ~90 kB gzipped; it is only worth downloading once the user
// actually asks for the map view.
const PropertyMap = lazy(() => import('@/components/PropertyMap'));
import { useSEO } from '@/lib/seo/useSEO';
import { parseMoney } from '@/lib/format';
import { propertiesApi } from '@/lib/api';
import type { PropertyType } from '@/lib/api/types';

const PROPERTY_TYPES: PropertyType[] = ['apartment', 'house', 'condo', 'townhouse', 'studio', 'room'];
const BEDROOM_OPTIONS = [1, 2, 3, 4, 5];
const PER_PAGE = 12;

const SORTS = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

/**
 * Search results.
 *
 * All filter state lives in the URL query string. That makes results shareable
 * and bookmarkable, lets the browser back button work, and means crawlers can
 * reach filtered listings instead of only ever seeing an empty client-rendered
 * page.
 */
export default function Properties() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');

  const q = searchParams.get('q') ?? '';
  const city = searchParams.get('city') ?? '';
  const type = searchParams.get('type') ?? '';
  const bedrooms = searchParams.get('bedrooms') ?? '';
  const maxPrice = searchParams.get('max_price') ?? '';
  const sort = searchParams.get('sort') ?? 'relevance';
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;

  useSEO({
    title: city ? `Properties for rent in ${city}` : 'Properties for rent in Nigeria',
    description: city
      ? `Browse ${type || ''} properties for rent in ${city}, Nigeria. Filter by bedrooms, budget and amenities on Agently.`
      : 'Search verified rental properties across Nigeria. Filter by city, property type, bedrooms, budget and amenities.',
    canonicalPath: `/properties${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
  });

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '' || value === 'any') next.delete(key);
      else next.set(key, value);
    }
    // Any filter change invalidates the current page offset.
    if (!('page' in patch)) next.delete('page');
    setSearchParams(next, { replace: false });
  };

  const queryKey = useMemo(
    () => ['properties', 'search', { q, city, type, bedrooms, maxPrice, sort, page }],
    [q, city, type, bedrooms, maxPrice, sort, page]
  );

  const search = useQuery({
    queryKey,
    queryFn: () =>
      propertiesApi
        .list({
          q: q || undefined,
          city: city || undefined,
          type: (type as PropertyType) || undefined,
          bedrooms: bedrooms ? Number.parseInt(bedrooms, 10) : undefined,
          max_price: maxPrice ? parseMoney(maxPrice) : undefined,
          sort: sort as 'relevance' | 'newest' | 'price_asc' | 'price_desc',
          page,
          per_page: PER_PAGE,
        })
        .then((r) => r),
    placeholderData: keepPreviousData,
  });

  const results = search.data?.data ?? [];
  const meta = search.data?.pagination;
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.per_page)) : 1;

  const activeFilters = [
    city && { key: 'city', label: city },
    type && { key: 'type', label: type },
    bedrooms && { key: 'bedrooms', label: `${bedrooms}+ bed` },
    maxPrice && { key: 'max_price', label: `max ₦${maxPrice}` },
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  const clearAll = () => setSearchParams(new URLSearchParams(), { replace: false });

  const filterControls = (
    <div className="space-y-6">
      <div>
        <Label htmlFor="filter-city">City</Label>
        <Input
          id="filter-city"
          placeholder="e.g. Lagos"
          value={city}
          onChange={(event) => update({ city: event.target.value })}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="filter-type">Property type</Label>
        <Select value={type || 'any'} onValueChange={(value) => update({ type: value })}>
          <SelectTrigger id="filter-type" className="mt-1.5">
            <SelectValue placeholder="Any type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any type</SelectItem>
            {PROPERTY_TYPES.map((value) => (
              <SelectItem key={value} value={value} className="capitalize">
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-bedrooms">Bedrooms</Label>
        <Select value={bedrooms || 'any'} onValueChange={(value) => update({ bedrooms: value })}>
          <SelectTrigger id="filter-bedrooms" className="mt-1.5">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {BEDROOM_OPTIONS.map((value) => (
              <SelectItem key={value} value={String(value)}>
                {value}+
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-price">Maximum yearly rent (₦)</Label>
        <Input
          id="filter-price"
          inputMode="numeric"
          placeholder="e.g. 3000000"
          value={maxPrice}
          onChange={(event) => update({ max_price: event.target.value.replace(/[^\d]/g, '') })}
          className="mt-1.5"
        />
      </div>

      {activeFilters.length > 0 && (
        <Button variant="outline" size="sm" className="w-full" onClick={clearAll}>
          <X className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Properties for rent</h1>
        <p className="mt-1 text-muted-foreground">
          {meta ? `${meta.total.toLocaleString('en-NG')} matching ${meta.total === 1 ? 'property' : 'properties'}` : 'Searching…'}
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          aria-label="Search properties"
          placeholder="Search by title, address or neighbourhood…"
          value={q}
          onChange={(event) => update({ q: event.target.value })}
          className="flex-1"
        />
        <Select value={sort} onValueChange={(value) => update({ sort: value })}>
          <SelectTrigger className="sm:w-56" aria-label="Sort results">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="hidden items-center rounded-md border p-0.5 sm:flex" role="group" aria-label="Results view">
          <Button
            size="sm"
            variant={view === 'list' ? 'secondary' : 'ghost'}
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
          >
            List
          </Button>
          <Button
            size="sm"
            variant={view === 'map' ? 'secondary' : 'ghost'}
            onClick={() => setView('map')}
            aria-pressed={view === 'map'}
          >
            Map
          </Button>
        </div>
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden">
              <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
              Filters
              {activeFilters.length > 0 && (
                <Badge variant="secondary" className="ml-2">{activeFilters.length}</Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">{filterControls}</div>
          </SheetContent>
        </Sheet>
      </div>

      {activeFilters.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="gap-1 capitalize">
              {filter.label}
              <button
                type="button"
                onClick={() => update({ [filter.key]: null })}
                aria-label={`Remove ${filter.label} filter`}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Filters
            </h2>
            {filterControls}
          </div>
        </aside>

        <section>
          {view === 'map' ? (
            search.isLoading ? (
              <Skeleton className="h-[560px] w-full rounded-lg" />
            ) : (
              <Suspense fallback={<Skeleton className="h-[560px] w-full rounded-lg" />}>
                <PropertyMap properties={results} />
              </Suspense>
            )
          ) : (
            <PropertyGrid
              properties={results}
              isLoading={search.isLoading || (search.isFetching && results.length === 0)}
            />
          )}

          {search.isError && (
            <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive">
              We could not load properties. Please try again.
            </p>
          )}

          {totalPages > 1 && (
            <>
              <Separator className="my-8" />
              <nav className="flex items-center justify-between" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => update({ page: String(page - 1) })}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Previous
                </Button>
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => update({ page: String(page + 1) })}
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </nav>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
