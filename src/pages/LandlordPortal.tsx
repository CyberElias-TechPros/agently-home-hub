import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Home, DollarSign, Calendar, Users, Wrench, FileText, TrendingUp, BarChart3, AlertTriangle, CheckCircle, Clock, Plus, Edit, Eye, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { Property, Booking, MaintenanceRequest, User } from '@/types';

const LandlordPortal = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('properties');
  
  // State for landlord data
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [tenants, setTenants] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated && user) {
      loadLandlordData();
    }
  }, [isAuthenticated, user]);

  const loadLandlordData = async () => {
    try {
      setLoading(true);
      const [propertiesData, bookingsData, maintenanceData, tenantsData] = await Promise.all([
        apiService.getLandlordProperties(user.id),
        apiService.getLandlordBookings(user.id),
        apiService.getLandlordMaintenanceRequests(user.id),
        apiService.getLandlordTenants(user.id)
      ]);
      
      setProperties(propertiesData);
      setBookings(bookingsData);
      setMaintenanceRequests(maintenanceData);
      setTenants(tenantsData);
    } catch (error) {
      toast({
        title: "Error loading landlord data",
        description: "Failed to load landlord information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveBooking = async (bookingId: string) => {
    try {
      setLoading(true);
      await apiService.approveBooking(bookingId);
      setBookings(bookings.map(b => b.id === bookingId ? {...b, status: 'confirmed'} : b));
      toast({
        title: "Booking Approved",
        description: "The booking has been confirmed successfully.",
      });
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: "Failed to approve booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const rejectBooking = async (bookingId: string, reason: string) => {
    try {
      setLoading(true);
      await apiService.rejectBooking(bookingId, reason);
      setBookings(bookings.map(b => b.id === bookingId ? {...b, status: 'cancelled'} : b));
      toast({
        title: "Booking Rejected",
        description: "The booking has been rejected.",
      });
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: "Failed to reject booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMaintenanceStatus = async (requestId: string, status: string) => {
    try {
      setLoading(true);
      await apiService.updateMaintenanceStatus(requestId, status);
      setMaintenanceRequests(maintenanceRequests.map(m => m.id === requestId ? {...m, status: status as any} : m));
      toast({
        title: "Maintenance Updated",
        description: `Maintenance request has been ${status}.`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update maintenance status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMaintenanceStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPropertyBookings = (propertyId: string) => {
    return bookings.filter(b => b.propertyId === propertyId);
  };

  const getPropertyMaintenance = (propertyId: string) => {
    return maintenanceRequests.filter(m => m.propertyId === propertyId);
  };

  const getOccupancyRate = (propertyId: string) => {
    const propertyBookings = getPropertyBookings(propertyId);
    const totalBookings = propertyBookings.length;
    const confirmedBookings = propertyBookings.filter(b => b.status === 'confirmed').length;
    return totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;
  };

  const getRevenue = (propertyId: string) => {
    const propertyBookings = getPropertyBookings(propertyId);
    return propertyBookings
      .filter(b => b.status === 'confirmed')
      .reduce((total, booking) => total + booking.totalPrice, 0);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Landlord Portal</h1>
        <p className="text-muted-foreground">Manage your properties, tenants, and income</p>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to access landlord features.</p>
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Your Properties</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </div>

              {properties.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {properties.map((property) => {
                    const bookings = getPropertyBookings(property.id);
                    const maintenance = getPropertyMaintenance(property.id);
                    const occupancyRate = getOccupancyRate(property.id);
                    const revenue = getRevenue(property.id);
                    
                    return (
                      <Card key={property.id}>
                        <CardContent className="p-6">
                          <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                            <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                          </div>
                          
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-semibold text-lg">{property.title}</h4>
                              <p className="text-sm text-muted-foreground">{property.location.address}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">${property.price}/month</div>
                              <div className="text-sm text-muted-foreground">{property.bedrooms} beds • {property.bathrooms} baths</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <div className="text-lg font-bold text-blue-700">{bookings.length}</div>
                              <div className="text-sm text-blue-700">Bookings</div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <div className="text-lg font-bold text-orange-700">{maintenance.filter(m => m.status !== 'resolved').length}</div>
                              <div className="text-sm text-orange-700">Open Issues</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <div className="text-lg font-bold text-green-700">{occupancyRate.toFixed(0)}%</div>
                              <div className="text-sm text-green-700">Occupancy</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <div className="text-lg font-bold text-purple-700">${revenue.toLocaleString()}</div>
                              <div className="text-sm text-purple-700">Revenue</div>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setActiveTab('bookings')}>
                              <Eye className="h-4 w-4 mr-1" />
                              View Bookings
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setActiveTab('maintenance')}>
                              <Wrench className="h-4 w-4 mr-1" />
                              Maintenance
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Properties</h3>
                    <p className="text-muted-foreground mb-4">Add your first property to get started.</p>
                    <Button>Add Property</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Booking Requests</h3>
                <div className="text-sm text-muted-foreground">
                  {bookings.length} bookings • {bookings.filter(b => b.status === 'pending').length} pending
                </div>
              </div>

              {bookings.length > 0 ? (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const property = properties.find(p => p.id === booking.propertyId);
                    const tenant = tenants.find(t => t.id === booking.tenantId);
                    
                    return (
                      <Card key={booking.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4 mb-2">
                                <div>
                                  <h4 className="font-semibold">{property?.title}</h4>
                                  <p className="text-sm text-muted-foreground">{property?.location.address}</p>
                                </div>
                                <Badge className={getBookingStatusColor(booking.status)}>
                                  {booking.status}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Tenant:</span>
                                  <span className="ml-2 font-medium">{tenant?.name}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Dates:</span>
                                  <span className="ml-2 font-medium">{new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total:</span>
                                  <span className="ml-2 font-medium">${booking.totalPrice}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Created:</span>
                                  <span className="ml-2 font-medium">{new Date(booking.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Monthly Rate</div>
                              <div className="text-lg font-bold">${property?.price}</div>
                            </div>
                          </div>

                          {booking.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                onClick={() => approveBooking(booking.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => rejectBooking(booking.id, "Property not available")}
                              >
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                              <Button variant="outline" size="sm">
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Message
                              </Button>
                            </div>
                          )}

                          {booking.status === 'confirmed' && (
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4 mr-1" />
                                Lease Agreement
                              </Button>
                              <Button variant="outline" size="sm">
                                <DollarSign className="h-4 w-4 mr-1" />
                                Collect Payment
                              </Button>
                            </div>
                          )}
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
                    <p className="text-muted-foreground">Bookings will appear here when tenants request to rent your properties.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Maintenance Requests</h3>
              
              {maintenanceRequests.length > 0 ? (
                <div className="space-y-4">
                  {maintenanceRequests.map((request) => {
                    const property = properties.find(p => p.id === request.propertyId);
                    const tenant = tenants.find(t => t.id === request.tenantId);
                    
                    return (
                      <Card key={request.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4 mb-2">
                                <div>
                                  <h4 className="font-semibold">{request.title}</h4>
                                  <p className="text-sm text-muted-foreground">{property?.title} • {property?.location.address}</p>
                                </div>
                                <Badge className={getMaintenanceStatusColor(request.status)}>
                                  {request.status}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-4">{request.description}</p>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Category:</span>
                                  <span className="ml-2 font-medium">{request.category}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Priority:</span>
                                  <span className="ml-2 font-medium">{request.priority}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Tenant:</span>
                                  <span className="ml-2 font-medium">{tenant?.name}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Reported:</span>
                                  <span className="ml-2 font-medium">{new Date(request.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Created</div>
                              <div className="text-lg font-bold">{new Date(request.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            {request.status !== 'resolved' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => updateMaintenanceStatus(request.id, 'in_progress')}
                                >
                                  In Progress
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => updateMaintenanceStatus(request.id, 'resolved')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Resolved
                                </Button>
                              </>
                            )}
                            <Button variant="outline" size="sm">
                              <Wrench className="h-4 w-4 mr-1" />
                              Assign Vendor
                            </Button>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Contact Tenant
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Maintenance Requests</h3>
                    <p className="text-muted-foreground">Maintenance requests will appear here when tenants report issues.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tenants" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Your Tenants</h3>
              
              {tenants.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {tenants.map((tenant) => {
                    const tenantBookings = bookings.filter(b => b.tenantId === tenant.id);
                    const activeBookings = tenantBookings.filter(b => b.status === 'confirmed');
                    
                    return (
                      <Card key={tenant.id}>
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center text-2xl font-bold text-primary">
                              {tenant.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg">{tenant.name}</h4>
                              <p className="text-sm text-muted-foreground">{tenant.email}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                {tenant.verified && (
                                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                                )}
                                <Badge variant="outline" className="text-xs">{tenant.role}</Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Active Rentals:</span>
                              <span className="ml-2 font-medium">{activeBookings.length}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total Bookings:</span>
                              <span className="ml-2 font-medium">{tenantBookings.length}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Phone:</span>
                              <span className="ml-2 font-medium">{tenant.phone}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Member Since:</span>
                              <span className="ml-2 font-medium">{new Date((tenant as any).createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Message
                            </Button>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View History
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Tenants</h3>
                    <p className="text-muted-foreground">Tenants will appear here once they book your properties.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Property Analytics</h3>
              
              {properties.length > 0 ? (
                <div className="grid gap-6">
                  {/* Performance Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2" />
                        Performance Overview
                      </CardTitle>
                      <CardDescription>Overall property performance metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-6 bg-blue-50 rounded-lg">
                          <div className="text-3xl font-bold text-blue-700">{properties.length}</div>
                          <div className="text-sm text-blue-700">Total Properties</div>
                        </div>
                        <div className="text-center p-6 bg-green-50 rounded-lg">
                          <div className="text-3xl font-bold text-green-700">
                            {bookings.filter(b => b.status === 'confirmed').length}
                          </div>
                          <div className="text-sm text-green-700">Active Rentals</div>
                        </div>
                        <div className="text-center p-6 bg-orange-50 rounded-lg">
                          <div className="text-3xl font-bold text-orange-700">
                            {maintenanceRequests.filter(m => m.status !== 'resolved').length}
                          </div>
                          <div className="text-sm text-orange-700">Open Issues</div>
                        </div>
                        <div className="text-center p-6 bg-purple-50 rounded-lg">
                          <div className="text-3xl font-bold text-purple-700">
                            ${bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.totalPrice, 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-purple-700">Total Revenue</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Property Performance Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Property Performance</CardTitle>
                      <CardDescription>Detailed metrics by property</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Property</TableHead>
                            <TableHead>Occupancy Rate</TableHead>
                            <TableHead>Active Rentals</TableHead>
                            <TableHead>Monthly Revenue</TableHead>
                            <TableHead>Open Issues</TableHead>
                            <TableHead>Avg Rating</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {properties.map((property) => {
                            const propertyBookings = getPropertyBookings(property.id);
                            const confirmedBookings = propertyBookings.filter(b => b.status === 'confirmed');
                            const occupancyRate = propertyBookings.length > 0 ? 
                              (confirmedBookings.length / propertyBookings.length) * 100 : 0;
                            const monthlyRevenue = confirmedBookings.reduce((sum, b) => sum + property.price, 0);
                            const openIssues = getPropertyMaintenance(property.id).filter(m => m.status !== 'resolved').length;
                            
                            return (
                              <TableRow key={property.id}>
                                <TableCell className="font-medium">{property.title}</TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full" 
                                        style={{ width: `${occupancyRate}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium">{occupancyRate.toFixed(0)}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>{confirmedBookings.length}</TableCell>
                                <TableCell>${monthlyRevenue.toLocaleString()}</TableCell>
                                <TableCell>
                                  <Badge variant={openIssues > 0 ? "destructive" : "default"}>
                                    {openIssues}
                                  </Badge>
                                </TableCell>
                                <TableCell>4.5★</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Revenue Analytics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <DollarSign className="h-5 w-5 mr-2" />
                        Revenue Analytics
                      </CardTitle>
                      <CardDescription>Income and financial performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-6 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-700">
                            ${bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.totalPrice, 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-green-700">Total Revenue</div>
                        </div>
                        <div className="text-center p-6 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-700">
                            ${(bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.totalPrice, 0) / properties.length).toFixed(0)}
                          </div>
                          <div className="text-sm text-blue-700">Avg per Property</div>
                        </div>
                        <div className="text-center p-6 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-700">
                            {bookings.filter(b => b.status === 'confirmed').length}
                          </div>
                          <div className="text-sm text-purple-700">Active Bookings</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
                    <p className="text-muted-foreground">Analytics will be available once you have properties and bookings.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default LandlordPortal;