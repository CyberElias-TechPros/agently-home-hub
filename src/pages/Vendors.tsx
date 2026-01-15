import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Wrench, Calendar, Users, Star, DollarSign, FileText, CheckCircle, Clock, AlertTriangle, MessageSquare, Plus, Edit, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { Vendor, VendorService, VendorBooking, VendorReview, ServiceContract, ContractorProfile } from '@/types';

const Vendors = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('browse');
  
  // State for vendor management
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [services, setServices] = useState<VendorService[]>([]);
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedService, setSelectedService] = useState('');
  
  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    vendorId: '',
    serviceId: '',
    date: '',
    time: '',
    notes: ''
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      loadVendorData();
    }
  }, [isAuthenticated, user]);

  const loadVendorData = async () => {
    try {
      setLoading(true);
      const [vendorsData, servicesData, bookingsData, reviewsData, contractsData, contractorsData] = await Promise.all([
        apiService.getVendors(),
        apiService.getVendorServices(),
        apiService.getVendorBookings(user.id),
        apiService.getVendorReviews(),
        apiService.getServiceContracts(),
        apiService.getContractors()
      ]);
      
      setVendors(vendorsData);
      setServices(servicesData);
      setBookings(bookingsData);
      setReviews(reviewsData);
      setContracts(contractsData);
      setContractors(contractorsData);
    } catch (error) {
      toast({
        title: "Error loading vendor data",
        description: "Failed to load vendor information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const bookService = async () => {
    try {
      setLoading(true);
      const booking = await apiService.bookVendorService({
        ...bookingForm,
        clientId: user.id,
        status: 'confirmed',
        totalPrice: services.find(s => s.id === bookingForm.serviceId)?.price || 0,
        createdAt: new Date().toISOString()
      });
      
      setBookings([...bookings, booking]);
      toast({
        title: "Service Booked",
        description: "Your service has been booked successfully!",
      });
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Please check the availability and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      setLoading(true);
      await apiService.cancelVendorBooking(bookingId);
      setBookings(bookings.filter(b => b.id !== bookingId));
      toast({
        title: "Booking Cancelled",
        description: "Your service booking has been cancelled.",
      });
    } catch (error) {
      toast({
        title: "Cancellation Failed",
        description: "Please contact the vendor directly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const leaveReview = async (bookingId: string, rating: number, comment: string) => {
    try {
      setLoading(true);
      const review = await apiService.leaveVendorReview({
        bookingId,
        clientId: user.id,
        vendorId: bookings.find(b => b.id === bookingId)?.vendorId || '',
        rating,
        comment,
        createdAt: new Date().toISOString()
      });
      
      setReviews([...reviews, review]);
      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });
    } catch (error) {
      toast({
        title: "Review Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getVendorById = (vendorId: string) => {
    return vendors.find(v => v.id === vendorId);
  };

  const getServicesByVendor = (vendorId: string) => {
    return services.filter(s => s.vendorId === vendorId);
  };

  const getReviewsByVendor = (vendorId: string) => {
    return reviews.filter(r => r.vendorId === vendorId);
  };

  const getAverageRating = (vendorId: string) => {
    const vendorReviews = getReviewsByVendor(vendorId);
    if (vendorReviews.length === 0) return 0;
    const total = vendorReviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / vendorReviews.length).toFixed(1);
  };

  const filteredVendors = vendors.filter(vendor => 
    (selectedCategory === 'all' || vendor.services.includes(selectedCategory)) &&
    (vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     vendor.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredServices = services.filter(service => 
    (selectedService === '' || service.category === selectedService) &&
    (service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     service.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Vendor Marketplace</h1>
        <p className="text-muted-foreground">Find and book professional service providers</p>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to access vendor services.</p>
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors or services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Plumbing">Plumbing</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="HVAC">HVAC</SelectItem>
                  <SelectItem value="Cleaning">Cleaning</SelectItem>
                  <SelectItem value="Landscaping">Landscaping</SelectItem>
                  <SelectItem value="Painting">Painting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {activeTab === 'browse' ? `${vendors.length} vendors available` : `${bookings.length} bookings`}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="browse">Browse Vendors</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="bookings">My Bookings</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="contractors">Contractors</TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-48 bg-muted rounded mb-4"></div>
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded mb-4"></div>
                        <div className="flex justify-between">
                          <div className="h-8 bg-muted rounded w-16"></div>
                          <div className="h-8 bg-muted rounded w-16"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : filteredVendors.length > 0 ? (
                  filteredVendors.map((vendor) => {
                    const averageRating = getAverageRating(vendor.id);
                    const vendorServices = getServicesByVendor(vendor.id);
                    
                    return (
                      <Card key={vendor.id}>
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4 mb-4">
                            <Avatar className="h-16 w-16">
                              <AvatarImage src={vendor.profilePicture} />
                              <AvatarFallback>{vendor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{vendor.name}</h4>
                              <p className="text-sm text-muted-foreground">{vendor.businessName}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <div className="flex items-center space-x-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <span className="text-sm font-medium">{averageRating}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">({vendor.reviewCount} reviews)</span>
                                {vendor.verified && (
                                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-4">{vendor.description}</p>
                          
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {vendor.services.slice(0, 4).map((service, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{service}</Badge>
                            ))}
                            {vendor.services.length > 4 && (
                              <Badge variant="outline" className="text-xs">+{vendor.services.length - 4}</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>License: {vendor.licenseNumber}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>Insurance: {new Date(vendor.insuranceExpiry).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setActiveTab('services')}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Services
                            </Button>
                            <Button size="sm">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Contact
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="col-span-full">
                    <CardContent className="py-8 text-center">
                      <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Vendors Found</h3>
                      <p className="text-muted-foreground">Try adjusting your search criteria.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="services" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-48 bg-muted rounded mb-4"></div>
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded mb-4"></div>
                        <div className="flex justify-between">
                          <div className="h-8 bg-muted rounded w-16"></div>
                          <div className="h-8 bg-muted rounded w-16"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : filteredServices.length > 0 ? (
                  filteredServices.map((service) => {
                    const vendor = getVendorById(service.vendorId);
                    
                    return (
                      <Card key={service.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-semibold text-lg">{service.name}</h4>
                              <p className="text-sm text-muted-foreground">{service.description}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">${service.price}</div>
                              <div className="text-sm text-muted-foreground">Duration: {service.duration} min</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Category:</span>
                              <span className="ml-2 font-medium">{service.category}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Materials:</span>
                              <span className="ml-2 font-medium">{service.materialsIncluded ? 'Included' : 'Not included'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Warranty:</span>
                              <span className="ml-2 font-medium">{service.warranty}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Supplier:</span>
                              <span className="ml-2 font-medium">{service.supplier}</span>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button size="sm" onClick={() => {
                              setBookingForm({...bookingForm, serviceId: service.id, vendorId: service.vendorId});
                              setActiveTab('bookings');
                            }}>
                              <Calendar className="h-4 w-4 mr-2" />
                              Book Now
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="col-span-full">
                    <CardContent className="py-8 text-center">
                      <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Services Found</h3>
                      <p className="text-muted-foreground">Try adjusting your search criteria.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="bookings" className="mt-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">My Service Bookings</h3>
                  <Button onClick={() => setActiveTab('services')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Book New Service
                  </Button>
                </div>

                {bookings.length > 0 ? (
                  <div className="space-y-4">
                    {bookings.map((booking) => {
                      const vendor = getVendorById(booking.vendorId);
                      const service = services.find(s => s.id === booking.serviceId);
                      
                      return (
                        <Card key={booking.id}>
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <div className="flex items-center space-x-4 mb-2">
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage src={vendor?.profilePicture} />
                                    <AvatarFallback>{vendor?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <h4 className="font-semibold">{vendor?.name}</h4>
                                    <p className="text-sm text-muted-foreground">{service?.name}</p>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="ml-2 font-medium">{new Date(booking.date).toLocaleDateString()}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Time:</span>
                                    <span className="ml-2 font-medium">{booking.time}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Status:</span>
                                    <Badge variant={
                                      booking.status === 'confirmed' ? 'default' :
                                      booking.status === 'completed' ? 'secondary' :
                                      booking.status === 'cancelled' ? 'destructive' : 'outline'
                                    }>
                                      {booking.status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Total:</span>
                                    <span className="ml-2 font-medium">${booking.totalPrice}</span>
                                  </div>
                                </div>

                                {booking.notes && (
                                  <div className="mb-4 p-3 bg-muted rounded">
                                    <span className="text-sm">Notes: {booking.notes}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">Booked: {new Date(booking.createdAt).toLocaleDateString()}</div>
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Contact Vendor
                              </Button>
                              {booking.status === 'confirmed' && (
                                <Button variant="outline" size="sm" onClick={() => cancelBooking(booking.id)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Cancel
                                </Button>
                              )}
                              {booking.status === 'completed' && (
                                <Button size="sm">
                                  <Star className="h-4 w-4 mr-2" />
                                  Leave Review
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Bookings</h3>
                      <p className="text-muted-foreground mb-4">Book a service to see your bookings here.</p>
                      <Button onClick={() => setActiveTab('services')}>Browse Services</Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Vendor Reviews</h3>
                
                {reviews.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {reviews.map((review) => {
                      const vendor = getVendorById(review.vendorId);
                      const booking = bookings.find(b => b.id === review.bookingId);
                      
                      return (
                        <Card key={review.id}>
                          <CardContent className="p-6">
                            <div className="flex items-center space-x-3 mb-4">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={vendor?.profilePicture} />
                                <AvatarFallback>{vendor?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-semibold">{vendor?.name}</h4>
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center space-x-1">
                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                    <span className="font-medium">{review.rating}</span>
                                  </div>
                                  <span className="text-sm text-muted-foreground">• {new Date(review.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-4">{review.comment}</p>
                            
                            <div className="text-sm text-muted-foreground">
                              Service: {services.find(s => s.id === bookings.find(b => b.id === review.bookingId)?.serviceId)?.name}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Reviews</h3>
                      <p className="text-muted-foreground">Leave reviews for services you've booked.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="contractors" className="mt-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Professional Contractors</h3>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Specializations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Specializations</SelectItem>
                      <SelectItem value="Plumbing">Plumbing</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                      <SelectItem value="HVAC">HVAC</SelectItem>
                      <SelectItem value="Carpentry">Carpentry</SelectItem>
                      <SelectItem value="Painting">Painting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {contractors.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {contractors.map((contractor) => (
                      <Card key={contractor.id}>
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4 mb-4">
                            <Avatar className="h-16 w-16">
                              <AvatarImage src={contractor.profilePicture} />
                              <AvatarFallback>{contractor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold text-lg">{contractor.name}</h4>
                              <p className="text-sm text-muted-foreground">{contractor.businessName}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="secondary">{contractor.rating}★</Badge>
                                <Badge>{contractor.completedJobs} jobs</Badge>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-4">{contractor.description}</p>
                          
                          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Specializations:</span>
                              <div className="mt-1 space-y-1">
                                {contractor.specializations.slice(0, 3).map((spec, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">{spec}</Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Availability:</span>
                              <div className="mt-1 space-y-1">
                                {Object.entries(contractor.availability).map(([day, hours]) => (
                                  <div key={day} className="text-xs">
                                    <span className="font-medium">{day}:</span> {hours.start} - {hours.end}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </Button>
                            <Button size="sm">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Contact
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Contractors Available</h3>
                      <p className="text-muted-foreground">Check back later for more contractors.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Vendors;