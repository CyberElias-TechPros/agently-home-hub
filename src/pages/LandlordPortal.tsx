import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Home, DollarSign, Users, Wrench, TrendingUp, Plus, Eye, Edit, AlertTriangle } from 'lucide-react';
import { mockProperties, mockBookings, mockMaintenanceRequests } from '@/lib/mockData';
import { Property, Booking, MaintenanceRequest } from '@/types';

const LandlordPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Mock landlord data - assuming landlord ID 1 owns multiple properties
  const landlordId = '1';
  const landlordProperties = mockProperties.filter(p => p.landlordId === landlordId);
  const propertyBookings = mockBookings.filter(b => landlordProperties.some(p => p.id === b.propertyId));
  const propertyMaintenance = mockMaintenanceRequests.filter(m => landlordProperties.some(p => p.id === m.propertyId));

  const totalMonthlyRent = propertyBookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + mockProperties.find(p => p.id === b.propertyId)!.price, 0);

  const occupancyRate = landlordProperties.length > 0
    ? (propertyBookings.filter(b => b.status === 'confirmed').length / landlordProperties.length) * 100
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Landlord Portal</h1>
        <p className="text-muted-foreground">Manage your properties, tenants, and rental income</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{landlordProperties.length}</div>
                <p className="text-xs text-muted-foreground">
                  {propertyBookings.filter(b => b.status === 'confirmed').length} occupied
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalMonthlyRent.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{occupancyRate.toFixed(0)}%</div>
                <Progress value={occupancyRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {propertyMaintenance.filter(m => m.status !== 'resolved').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Maintenance requests
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from your properties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <DollarSign className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Rent Payment Received</p>
                      <p className="text-xs text-muted-foreground">Property: Modern Downtown Apartment - $2,500</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">New Tenant Application</p>
                      <p className="text-xs text-muted-foreground">Property: Luxury High-Rise Condo</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium">Maintenance Request</p>
                      <p className="text-xs text-muted-foreground">Property: Modern Downtown Apartment - Plumbing</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common landlord tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Plus className="h-6 w-6 mb-2" />
                    Add Property
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Eye className="h-6 w-6 mb-2" />
                    View Applications
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <DollarSign className="h-6 w-6 mb-2" />
                    Collect Rent
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Wrench className="h-6 w-6 mb-2" />
                    Manage Maintenance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="properties" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">My Properties</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {landlordProperties.map((property) => {
              const booking = propertyBookings.find(b => b.propertyId === property.id && b.status === 'confirmed');
              const maintenanceCount = propertyMaintenance.filter(m => m.propertyId === property.id && m.status !== 'resolved').length;

              return (
                <Card key={property.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{property.title}</CardTitle>
                      <Badge variant={booking ? 'default' : 'secondary'}>
                        {booking ? 'Occupied' : 'Vacant'}
                      </Badge>
                    </div>
                    <CardDescription>{property.location.city}, {property.location.state}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-32 object-cover rounded-lg"
                      />

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Monthly Rent</p>
                          <p className="font-semibold">${property.price}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Bedrooms</p>
                          <p className="font-semibold">{property.bedrooms}</p>
                        </div>
                      </div>

                      {maintenanceCount > 0 && (
                        <div className="flex items-center text-orange-600 text-sm">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {maintenanceCount} open maintenance request{maintenanceCount > 1 ? 's' : ''}
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="tenants" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Tenants</CardTitle>
              <CardDescription>Manage your property occupants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {propertyBookings.filter(b => b.status === 'confirmed').map((booking) => {
                  const property = landlordProperties.find(p => p.id === booking.propertyId);
                  return (
                    <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>T</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">Tenant #{booking.tenantId}</p>
                          <p className="text-sm text-muted-foreground">
                            {property?.title} - ${property?.price}/month
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Lease: {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">View Profile</Button>
                        <Button variant="outline" size="sm">Send Message</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rent Collection</CardTitle>
                <CardDescription>Track rent payments and outstanding balances</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">This Month's Collection</span>
                    <span className="font-semibold text-green-600">${totalMonthlyRent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Outstanding Balance</span>
                    <span className="font-semibold text-red-600">$0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average Collection Rate</span>
                    <span className="font-semibold">98%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Recent rent collection activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { property: 'Modern Downtown Apartment', amount: 2500, date: '2024-11-01', status: 'Paid' },
                    { property: 'Luxury High-Rise Condo', amount: 3200, date: '2024-11-01', status: 'Paid' },
                    { property: 'Cozy Studio Near Campus', amount: 1400, date: '2024-11-01', status: 'Paid' },
                  ].map((payment, index) => (
                    <div key={index} className="flex justify-between items-center py-2">
                      <div>
                        <p className="font-medium">{payment.property}</p>
                        <p className="text-sm text-muted-foreground">{payment.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${payment.amount}</p>
                        <Badge variant="secondary" className="text-xs">{payment.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Overview</CardTitle>
              <CardDescription>Track and manage property maintenance requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {propertyMaintenance.map((request) => {
                  const property = landlordProperties.find(p => p.id === request.propertyId);
                  return (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{request.title}</h4>
                          <p className="text-sm text-muted-foreground">{property?.title}</p>
                        </div>
                        <Badge variant={
                          request.status === 'resolved' ? 'default' :
                          request.status === 'in_progress' ? 'secondary' : 'outline'
                        }>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{request.description}</p>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Priority: {request.priority}</span>
                        <span>Category: {request.category}</span>
                        <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <Button variant="outline" size="sm">Assign Vendor</Button>
                        <Button variant="outline" size="sm">View Details</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Revenue Analytics
                </CardTitle>
                <CardDescription>Your property performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Annual Revenue</span>
                    <span className="font-semibold">${(totalMonthlyRent * 12).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Rent per Property</span>
                    <span className="font-semibold">${landlordProperties.length > 0 ? (totalMonthlyRent / landlordProperties.length).toFixed(0) : 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Occupancy Rate</span>
                    <span className="font-semibold">{occupancyRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Maintenance Cost (Monthly)</span>
                    <span className="font-semibold">$450</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Property Performance</CardTitle>
                <CardDescription>Individual property metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {landlordProperties.map((property) => {
                    const isOccupied = propertyBookings.some(b => b.propertyId === property.id && b.status === 'confirmed');
                    return (
                      <div key={property.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">{property.title}</p>
                          <p className="text-xs text-muted-foreground">${property.price}/month</p>
                        </div>
                        <Badge variant={isOccupied ? 'default' : 'secondary'}>
                          {isOccupied ? 'Occupied' : 'Vacant'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LandlordPortal;