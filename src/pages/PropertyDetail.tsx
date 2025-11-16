import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MapPin, Bed, Bath, Square, Calendar, Heart, Share2, MessageSquare, CheckCircle2 } from 'lucide-react';
import { mockProperties } from '@/lib/mockData';

export default function PropertyDetail() {
  const { id } = useParams();
  const property = mockProperties.find(p => p.id === id);

  if (!property) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
        <Link to="/properties">
          <Button>Back to Properties</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 pb-20 md:pb-8">
      <div className="container mx-auto px-4">
        {/* Image Gallery */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl overflow-hidden">
            <div className="aspect-[4/3] md:aspect-auto md:row-span-2">
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>
            {property.images.slice(1).map((image, index) => (
              <div key={index} className="aspect-[4/3] hidden md:block">
                <img
                  src={image}
                  alt={`${property.title} ${index + 2}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{property.type.charAt(0).toUpperCase() + property.type.slice(1)}</Badge>
                    {property.featured && (
                      <Badge variant="secondary" className="bg-accent text-accent-foreground">
                        Featured
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{property.location.address}, {property.location.city}, {property.location.state}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 py-4">
                {property.bedrooms > 0 && (
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-primary" />
                    <span className="font-semibold">{property.bedrooms}</span>
                    <span className="text-muted-foreground">Bedrooms</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Bath className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{property.bathrooms}</span>
                  <span className="text-muted-foreground">Bathrooms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Square className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{property.area}</span>
                  <span className="text-muted-foreground">sq ft</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h2 className="text-2xl font-bold mb-4">About This Property</h2>
              <p className="text-muted-foreground leading-relaxed">{property.description}</p>
            </div>

            <Separator />

            {/* Amenities */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {property.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Availability */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Availability</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-5 w-5" />
                <span>Available from {new Date(property.availableFrom).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">${property.price}</span>
                  <span className="text-muted-foreground text-base font-normal">/month</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" size="lg">
                  Request Booking
                </Button>
                <Button className="w-full" variant="outline" size="lg">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Contact Landlord
                </Button>
                <Separator />
                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="flex justify-between">
                    <span>Security Deposit</span>
                    <span className="font-semibold text-foreground">${property.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Rent</span>
                    <span className="font-semibold text-foreground">${property.price}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
