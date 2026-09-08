import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bath,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageSquare,
  Ruler,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { BookingForm, type BookingFormValues } from '@/components/BookingForm';
import { JsonLd } from '@/components/common/JsonLd';
import { useSEO, absoluteUrl } from '@/lib/seo/useSEO';
import { breadcrumbSchema, propertySchema } from '@/lib/seo/structuredData';
import { formatDate, formatMoney, propertyTypeLabel } from '@/lib/format';
import { bookingsApi, messagesApi, propertiesApi } from '@/lib/api';
import { propertyKeys } from '@/lib/query-keys';

export default function PropertyDetail() {
  const { id = '' } = useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);
  const [showBooking, setShowBooking] = useState(false);

  const property = useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => propertiesApi.get(id).then((r) => r.data),
    enabled: id.length > 0,
  });

  const data = property.data;

  useSEO({
    title: data ? `${data.title} — ${data.city}, ${data.state}` : 'Property',
    description: data
      ? `${propertyTypeLabel(data.type)} for rent in ${data.city}, ${data.state}. ${data.bedrooms} bedrooms, ${data.bathrooms} bathrooms. ${formatMoney(data.price, data.currency)} per year.`
      : 'Property details on Agently.',
    canonicalPath: `/properties/${id}`,
    noindex: property.isError,
  });

  const booking = useMutation({
    mutationFn: (values: BookingFormValues) => bookingsApi.create({ property_id: data!.id, ...values }),
    onSuccess: () => {
      toast({ title: 'Request sent', description: 'The landlord has been notified and will respond.' });
      setShowBooking(false);
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not send request', description: error.message, variant: 'destructive' });
    },
  });

  const startConversation = useMutation({
    mutationFn: () =>
      messagesApi.start({
        participant_id: data!.landlord_id,
        property_id: data!.id,
        content: `Hi — I am interested in “${data!.title}”. Is it still available?`,
      }),
    onSuccess: () => navigate('/messages'),
    onError: (error: Error) => {
      toast({ title: 'Could not start a conversation', description: error.message, variant: 'destructive' });
    },
  });

  if (property.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
        <Skeleton className="mt-6 h-8 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/3" />
      </div>
    );
  }

  if (property.isError || !data) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Property not found</h1>
        <p className="mt-2 text-muted-foreground">
          This listing may have been removed or is no longer public.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/properties">Browse other properties</Link>
        </Button>
      </div>
    );
  }

  const images = data.images.length > 0 ? data.images : [];
  const isOwnListing = user?.id === data.landlord_id;
  const canBook = data.status === 'available' && !isOwnListing;

  return (
    <>
      {data && (
        <JsonLd
          data={[
            propertySchema(data, absoluteUrl(`/properties/${data.slug || data.id}`)),
            breadcrumbSchema([
              { name: 'Home', url: absoluteUrl('/') },
              { name: 'Properties', url: absoluteUrl('/properties') },
              { name: data.title, url: absoluteUrl(`/properties/${data.slug || data.id}`) },
            ]),
          ]}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
          <ol className="flex items-center gap-1">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/properties" className="hover:text-foreground">Properties</Link></li>
            <li aria-hidden="true">/</li>
            <li className="truncate text-foreground" aria-current="page">{data.title}</li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            {/* Gallery */}
            <div className="relative overflow-hidden rounded-xl bg-muted">
              {images.length > 0 ? (
                <img
                  src={images[activeImage]}
                  alt={`${data.title} — photo ${activeImage + 1} of ${images.length}`}
                  className="aspect-[16/10] w-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="flex aspect-[16/10] w-full items-center justify-center text-muted-foreground">
                  <MapPin className="h-10 w-10" aria-hidden="true" />
                  <span className="sr-only">No photos available for this property</span>
                </div>
              )}

              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full"
                    onClick={() => setActiveImage((index) => (index - 1 + images.length) % images.length)}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full"
                    onClick={() => setActiveImage((index) => (index + 1) % images.length)}
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <span className="absolute bottom-3 right-3 rounded-full bg-background/80 px-2.5 py-1 text-xs backdrop-blur">
                    {activeImage + 1} / {images.length}
                  </span>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                      index === activeImage ? 'border-primary' : 'border-transparent'
                    }`}
                    aria-label={`Show photo ${index + 1}`}
                    aria-current={index === activeImage}
                  >
                    <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            {/* Overview */}
            <div className="mt-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{propertyTypeLabel(data.type)}</Badge>
                    <Badge variant="outline" className="capitalize">{data.status}</Badge>
                    {data.featured && <Badge className="bg-accent text-accent-foreground">Featured</Badge>}
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">{data.title}</h1>
                  <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {data.address_line1}
                    {data.address_line2 ? `, ${data.address_line2}` : ''}, {data.city}, {data.state}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{formatMoney(data.price, data.currency)}</p>
                  <p className="text-sm text-muted-foreground">per year</p>
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-4">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <BedDouble className="h-3.5 w-3.5" aria-hidden="true" /> Bedrooms
                  </dt>
                  <dd className="mt-1 font-semibold">{data.bedrooms}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <Bath className="h-3.5 w-3.5" aria-hidden="true" /> Bathrooms
                  </dt>
                  <dd className="mt-1 font-semibold">{data.bathrooms}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <Ruler className="h-3.5 w-3.5" aria-hidden="true" /> Floor area
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {data.area_sqft ? `${data.area_sqft.toLocaleString('en-NG')} sqft` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Available from
                  </dt>
                  <dd className="mt-1 font-semibold">{formatDate(data.available_from)}</dd>
                </div>
              </dl>

              {data.description && (
                <section className="mt-8">
                  <h2 className="mb-2 text-lg font-semibold">About this property</h2>
                  <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                    {data.description}
                  </p>
                </section>
              )}

              {data.amenities.length > 0 && (
                <section className="mt-8">
                  <h2 className="mb-3 text-lg font-semibold">Amenities</h2>
                  <ul className="flex flex-wrap gap-2">
                    {data.amenities.map((amenity) => (
                      <li key={amenity}>
                        <Badge variant="outline" className="font-normal">
                          {amenity}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>

          {/* Enquiry sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {isOwnListing ? 'Your listing' : 'Interested?'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.landlord_name && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
                    Listed by {data.landlord_name}
                  </p>
                )}

                {data.deposit !== null && (
                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Deposit</span>
                      <span className="font-medium">{formatMoney(data.deposit, data.currency)}</span>
                    </p>
                    {data.minimum_lease_months !== null && (
                      <p className="mt-1 flex justify-between">
                        <span className="text-muted-foreground">Minimum lease</span>
                        <span className="font-medium">{data.minimum_lease_months} months</span>
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                {isOwnListing ? (
                  <Button className="w-full" asChild>
                    <Link to="/landlord">Manage your listings</Link>
                  </Button>
                ) : !isAuthenticated ? (
                  <div className="space-y-2">
                    <Button className="w-full" asChild>
                      <Link to="/auth?mode=login">Sign in to enquire</Link>
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      No account? <Link to="/auth?mode=register" className="underline">Create one</Link>
                    </p>
                  </div>
                ) : showBooking ? (
                  <BookingForm
                    property={data}
                    isSubmitting={booking.isPending}
                    onCancel={() => setShowBooking(false)}
                    onSubmit={async (values) => {
                      await booking.mutateAsync(values);
                    }}
                  />
                ) : (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      disabled={!canBook}
                      onClick={() => setShowBooking(true)}
                    >
                      {canBook ? 'Request this property' : 'Not accepting requests'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={startConversation.isPending}
                      onClick={() => startConversation.mutate()}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                      Message landlord
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}
