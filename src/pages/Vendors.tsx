import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, MapPin, Phone, Mail } from 'lucide-react';
import { mockVendors, mockVendorServices, mockVendorBookings } from '@/lib/mockData';
import { Vendor, VendorService, VendorBooking } from '@/types';

const Vendors = () => {
  const [activeTab, setActiveTab] = useState('directory');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Vendor Marketplace</h1>
        <p className="text-muted-foreground">Find and book trusted service providers</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="directory">Vendor Directory</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="bookings">My Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockVendors.map((vendor) => (
              <Card key={vendor.id}>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={vendor.avatar} />
                      <AvatarFallback>{vendor.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{vendor.businessName}</CardTitle>
                      <CardDescription>{vendor.name}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="ml-1 text-sm">{vendor.rating}</span>
                      <span className="ml-1 text-sm text-muted-foreground">({vendor.reviewCount})</span>
                    </div>
                    {vendor.verified && <Badge variant="secondary">Verified</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{vendor.description}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      {vendor.location.city}, {vendor.location.state}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      {vendor.phone}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {vendor.services.slice(0, 3).map((service, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{service}</Badge>
                    ))}
                  </div>
                  <Button className="w-full">View Profile</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockVendorServices.map((service) => {
              const vendor = mockVendors.find(v => v.id === service.vendorId);
              return (
                <Card key={service.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <CardDescription>{vendor?.businessName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">{service.description}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Price:</span>
                        <span className="font-semibold">${service.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Duration:</span>
                        <span>{service.duration} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Warranty:</span>
                        <span>{service.warranty}</span>
                      </div>
                    </div>
                    <div className="flex items-center mb-4">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                      <span className="text-sm">{vendor?.rating}</span>
                      <span className="text-sm text-muted-foreground ml-1">({vendor?.reviewCount} reviews)</span>
                    </div>
                    <Button className="w-full">Book Now</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          <div className="space-y-4">
            {mockVendorBookings.map((booking) => {
              const vendor = mockVendors.find(v => v.id === booking.vendorId);
              const service = mockVendorServices.find(s => s.id === booking.serviceId);
              return (
                <Card key={booking.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{service?.name}</CardTitle>
                    <CardDescription>{vendor?.businessName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Date & Time</p>
                        <p>{booking.date} at {booking.time}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>{booking.status}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-semibold">${booking.totalPrice}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Contact</p>
                        <p>{vendor?.phone}</p>
                      </div>
                    </div>
                    {booking.notes && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p>{booking.notes}</p>
                      </div>
                    )}
                    <div className="flex space-x-2">
                      <Button variant="outline">Reschedule</Button>
                      <Button variant="outline">Cancel</Button>
                      <Button>View Details</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Vendors;