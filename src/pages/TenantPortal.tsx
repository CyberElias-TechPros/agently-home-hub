import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Home, CreditCard, Wrench, FileText, MessageSquare, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { mockProperties, mockBookings, mockMaintenanceRequests } from '@/lib/mockData';
import { Property, Booking, MaintenanceRequest } from '@/types';

const TenantPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Mock current tenant data
  const currentUserId = '1';
  const currentBooking = mockBookings.find(b => b.tenantId === currentUserId);
  const currentProperty = currentBooking ? mockProperties.find(p => p.id === currentBooking.propertyId) : null;
  const maintenanceRequests = mockMaintenanceRequests.filter(m => m.tenantId === currentUserId);

  const leaseProgress = currentBooking ? Math.min(((new Date().getTime() - new Date(currentBooking.startDate).getTime()) / (new Date(currentBooking.endDate).getTime() - new Date(currentBooking.startDate).getTime())) * 100, 100) : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tenant Portal</h1>
        <p className="text-muted-foreground">Manage your rental, payments, and maintenance</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="property">My Property</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lease Status</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentBooking?.status === 'confirmed' ? 'Active' : 'Inactive'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {leaseProgress.toFixed(0)}% completed
                </p>
                <Progress value={leaseProgress} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$2,500</div>
                <p className="text-xs text-muted-foreground">
                  Due in 5 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {maintenanceRequests.filter(r => r.status !== 'resolved').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Maintenance issues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  Unread messages
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest tenant activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Rent Payment Processed</p>
                      <p className="text-xs text-muted-foreground">November 1, 2024</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Clock className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Maintenance Request Submitted</p>
                      <p className="text-xs text-muted-foreground">October 28, 2024</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <FileText className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">Lease Document Signed</p>
                      <p className="text-xs text-muted-foreground">October 15, 2024</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tenant tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col">
                    <CreditCard className="h-6 w-6 mb-2" />
                    Pay Rent
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <Wrench className="h-6 w-6 mb-2" />
                    Report Issue
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <MessageSquare className="h-6 w-6 mb-2" />
                    Contact Landlord
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col">
                    <FileText className="h-6 w-6 mb-2" />
                    View Lease
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="property" className="mt-6">
          {currentProperty ? (
            <Card>
              <CardHeader>
                <CardTitle>My Rental Property</CardTitle>
                <CardDescription>{currentProperty.location.address}, {currentProperty.location.city}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <img
                      src={currentProperty.images[0]}
                      alt={currentProperty.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold">Property Details</h4>
                      <p className="text-sm text-muted-foreground">{currentProperty.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Bedrooms</p>
                        <p className="font-semibold">{currentProperty.bedrooms}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bathrooms</p>
                        <p className="font-semibold">{currentProperty.bathrooms}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Area</p>
                        <p className="font-semibold">{currentProperty.area} sq ft</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly Rent</p>
                        <p className="font-semibold">${currentProperty.price}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Amenities</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentProperty.amenities.map((amenity, index) => (
                          <Badge key={index} variant="secondary">{amenity}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Rental</h3>
                <p className="text-muted-foreground">You don't have an active rental property.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
                <CardDescription>Your rent payment history and upcoming payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">$2,500</p>
                    <p className="text-sm text-muted-foreground">Monthly Rent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">$0</p>
                    <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">5 days</p>
                    <p className="text-sm text-muted-foreground">Next Due Date</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Your recent rent payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { date: 'November 1, 2024', amount: 2500, status: 'Paid' },
                    { date: 'October 1, 2024', amount: 2500, status: 'Paid' },
                    { date: 'September 1, 2024', amount: 2500, status: 'Paid' },
                  ].map((payment, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <div>
                        <p className="font-medium">{payment.date}</p>
                        <p className="text-sm text-muted-foreground">Rent Payment</p>
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

            <Card>
              <CardHeader>
                <CardTitle>Make a Payment</CardTitle>
                <CardDescription>Pay your rent securely online</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Pay Rent Now - $2,500</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit Maintenance Request</CardTitle>
                <CardDescription>Report issues with your rental property</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Report New Issue</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance History</CardTitle>
                <CardDescription>Your maintenance requests and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {maintenanceRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{request.title}</h4>
                        <Badge variant={
                          request.status === 'resolved' ? 'default' :
                          request.status === 'in_progress' ? 'secondary' : 'outline'
                        }>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Category: {request.category}</span>
                        <span>Priority: {request.priority}</span>
                        <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Lease Documents</CardTitle>
              <CardDescription>Access your lease agreement and related documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-semibold">Lease Agreement</p>
                      <p className="text-sm text-muted-foreground">Signed on October 15, 2024</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Download</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="font-semibold">Move-in Inspection</p>
                      <p className="text-sm text-muted-foreground">Completed on October 10, 2024</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Download</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="font-semibold">House Rules</p>
                      <p className="text-sm text-muted-foreground">Updated on September 1, 2024</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Download</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantPortal;