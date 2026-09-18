import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';
import {
  X, ArrowUpDown, Heart, MapPin, Bed, Bath, Square, DollarSign, Check, TrendingUp, ShieldCheck,
} from 'lucide-react';
import type { Property } from '@/types';
import { cn } from '@/lib/utils';

interface ComparisonItem {
  property: Property;
  score: number;
  pricePerSqft: number;
}

interface PropertyComparisonProps {
  properties: Property[];
  onPropertySelect?: (property: Property) => void;
  onRemove?: (propertyId: string) => void;
  maxProperties?: number;
}

/** Compute a normalized 0–100 "value score" per property. */
function scoreProperty(p: Property): ComparisonItem {
  const pricePerSqft = p.area > 0 ? p.price / p.area : 0;
  const amenityBonus = Math.min(p.amenities.length * 4, 24);
  const sizeBonus = Math.min((p.area / 2000) * 20, 20);
  const pricePenalty = Math.min((p.price / 6000) * 30, 30);
  const score = Math.round(Math.max(40, 100 - pricePenalty + sizeBonus + amenityBonus));
  return { property: p, score, pricePerSqft };
}

export default function PropertyComparison({
  properties,
  onPropertySelect,
  onRemove,
  maxProperties = 3,
}: PropertyComparisonProps) {
  const [sortDesc, setSortDesc] = useState(true);

  const items = useMemo(() => {
    const scored = properties.map(scoreProperty);
    return scored.sort((a, b) => (sortDesc ? b.score - a.score : a.score - b.score));
  }, [properties, sortDesc]);

  const best = items[0];
  const bestValue = useMemo(
    () => items.reduce((acc, i) => (i.pricePerSqft < acc.pricePerSqft ? i : acc), items[0]),
    [items],
  );
  const mostSpace = useMemo(
    () => items.reduce((acc, i) => (i.property.area > acc.property.area ? i : acc), items[0]),
    [items],
  );

  if (properties.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Add properties to compare — head to Browse Properties and hit the compare button.
      </div>
    );
  }

  const columns = items.slice(0, maxProperties);
  const attributes: { label: string; value: (item: ComparisonItem) => React.ReactNode }[] = [
    { label: 'Value score', value: (i) => <Badge className="bg-gradient-hero text-white">{i.score}/100</Badge> },
    { label: 'Price', value: (i) => <span className="font-semibold">${i.property.price}<span className="text-muted-foreground text-xs">/mo</span></span> },
    { label: 'Price / sqft', value: (i) => `$${i.pricePerSqft.toFixed(2)}` },
    { label: 'Bedrooms', value: (i) => `${i.property.bedrooms}` },
    { label: 'Bathrooms', value: (i) => `${i.property.bathrooms}` },
    { label: 'Area', value: (i) => `${i.property.area} sqft` },
    { label: 'Type', value: (i) => <span className="capitalize">{i.property.type}</span> },
    { label: 'Location', value: (i) => `${i.property.location.city}, ${i.property.location.state}` },
    { label: 'Available', value: (i) => i.property.availableFrom ? new Date(i.property.availableFrom).toLocaleDateString() : '—' },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Compare {columns.length} propert{columns.length === 1 ? 'y' : 'ies'}</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setSortDesc((s) => !s)}>
          <ArrowUpDown className="mr-1 h-4 w-4" /> {sortDesc ? 'Best first' : 'Lowest first'}
        </Button>
      </CardHeader>
      <CardContent>
        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Highlight label="Best overall" value={best?.property.title} tone="text-green-600" sub={`Score ${best?.score}/100`} />
          <Highlight label="Best value" value={bestValue?.property.title} tone="text-blue-600" sub={`$${bestValue?.pricePerSqft.toFixed(2)}/sqft`} />
          <Highlight label="Most space" value={mostSpace?.property.title} tone="text-violet-600" sub={`${mostSpace?.property.area} sqft`} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left font-medium text-muted-foreground w-36"> </th>
                {columns.map((item) => (
                  <th key={item.property.id} className="p-3 text-left min-w-[200px]">
                    <div className="relative">
                      {onRemove && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute -top-1 -right-1 h-6 w-6 text-muted-foreground"
                          onClick={() => onRemove(item.property.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <div className="aspect-video rounded-lg overflow-hidden mb-2 bg-muted">
                        <img src={item.property.images[0]} alt={item.property.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="font-semibold line-clamp-2">{item.property.title}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" /> {item.property.location.city}
                      </div>
                      <div className="flex gap-2 mt-2">
                        {onPropertySelect && (
                          <Button size="sm" className="h-7 w-full" onClick={() => onPropertySelect(item.property)}>View</Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 w-full" asChild>
                          <Link to={`/properties/${item.property.id}`}>Details</Link>
                        </Button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attributes.map((attr, i) => (
                <tr key={attr.label} className={cn('border-b', i % 2 === 1 && 'bg-muted/30')}>
                  <td className="p-3 text-muted-foreground font-medium">{attr.label}</td>
                  {columns.map((item) => (
                    <td key={item.property.id} className="p-3">
                      {attr.value(item)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-b">
                <td className="p-3 text-muted-foreground font-medium">Top amenities</td>
                {columns.map((item) => (
                  <td key={item.property.id} className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {item.property.amenities.slice(0, 4).map((a) => (
                        <Badge key={a} variant="secondary" className="capitalize">{a}</Badge>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <Separator className="my-4" />
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-success" /> Every listed property is Agently-verified. Scores are estimates for guidance only.
        </p>
      </CardContent>
    </Card>
  );
}

function Highlight({ label, value, sub, tone }: { label: string; value?: string; sub?: string; tone: string }) {
  return (
    <div className="text-center p-4 rounded-xl border bg-card">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className={cn('text-base font-bold', tone)}>{value ?? '—'}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
