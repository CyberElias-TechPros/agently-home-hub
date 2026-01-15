import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, Users, Wrench, FileText, AlertTriangle, CheckCircle, Plus, Edit, Eye, MapPin, Phone, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { WorkOrder, MaintenanceSchedule, ContractorProfile, MaintenanceAnalytics, MaintenanceReminder, InspectionChecklist } from '@/types';

const MaintenanceScheduling = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('work-orders');
  
  // State for maintenance scheduling
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [analytics, setAnalytics] = useState<MaintenanceAnalytics | null>(null);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [checklists, setChecklists] = useState<InspectionChecklist[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated && user) {
      loadMaintenanceData();
    }
  }, [isAuthenticated, user]);

  const loadMaintenanceData = async () => {
    try {
      setLoading(true);
      const [workOrdersData, schedulesData, contractorsData, analyticsData, remindersData, checklistsData] = await Promise.all([
        apiService.getMaintenanceWorkOrders(user.id),
        apiService.getMaintenanceSchedules(user.id),
        apiService.getMaintenanceContractors(),
        apiService.getMaintenanceAnalytics(),
        apiService.getMaintenanceReminders(user.id),
        apiService.getMaintenanceChecklists()
      ]);
      
      setWorkOrders(workOrdersData);
      setSchedules(schedulesData);
      setContractors(contractorsData);
      setAnalytics(analyticsData);
      setReminders(remindersData);
      setChecklists(checklistsData);
    } catch (error) {
      toast({
        title: "Error loading maintenance data",
        description: "Failed to load maintenance information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createWorkOrder = async (workOrderData) => {
    try {
      setLoading(true);
      const workOrder = await apiService.createWorkOrder(workOrderData);
      setWorkOrders([...workOrders, workOrder]);
      toast({
        title: "Work Order Created",
        description: "Maintenance work order has been created successfully!",
      });
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create work order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWorkOrderStatus = async (workOrderId, status) => {
    try {
      setLoading(true);
      await apiService.updateWorkOrderStatus(workOrderId, status);
      setWorkOrders(workOrders.map(wo => wo.id === workOrderId ? {...wo, status} : wo));
      toast({
        title: "Work Order Updated",
        description: `Work order has been ${status}.`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update work order status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignContractor = async (workOrderId, contractorId) => {
    try {
      setLoading(true);
      await apiService.assignContractor(workOrderId, contractorId);
      setWorkOrders(workOrders.map(wo => wo.id === workOrderId ? {...wo, assignedContractorId: contractorId} : wo));
      toast({
        title: "Contractor Assigned",
        description: "Contractor has been assigned to the work order.",
      });
    } catch (error) {
      toast({
        title: "Assignment Failed",
        description: "Failed to assign contractor. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWorkOrderStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContractorById = (contractorId) => {
    return contractors.find(c => c.id === contractorId);
  };

  const getScheduledTasks = () => {
    const now = new Date();
    return schedules.filter(s => new Date(s.nextDue) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
  };

  const getOverdueTasks = () => {
    const now = new Date();
    return schedules.filter(s => new Date(s.nextDue) < now);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Maintenance Scheduling</h1>
        <p className="text-muted-foreground">Schedule, track, and manage all maintenance activities</p>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to access maintenance scheduling.</p>
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
            <TabsTrigger value="contractors">Contractors</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
          </TabsList>

          <TabsContent value="work-orders" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Maintenance Work Orders</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Work Order
                </Button>
              </div>

              {workOrders.length > 0 ? (
                <div className="space-y-4">
                  {workOrders.map((workOrder) => {
                    const contractor = getContractorById(workOrder.assignedContractorId);
                    const maintenanceRequest = workOrder.maintenanceRequestId;
                    
                    return (
                      <Card key={workOrder.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4 mb-2">
                                <div>
                                  <h4 className="font-semibold text-lg">{workOrder.title}</h4>
                                  <p className="text-sm text-muted-foreground">{workOrder.description}</p>
                                </div>
                                <Badge className={getWorkOrderStatusColor(workOrder.status)}>
                                  {workOrder.status}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Category:</span>
                                  <span className="ml-2 font-medium">{workOrder.category}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Priority:</span>
                                  <Badge className={getPriorityColor(workOrder.priority)}>
                                    {workOrder.priority}
                                  </Badge>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Property:</span>
                                  <span className="ml-2 font-medium">{workOrder.propertyId}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Estimated Cost:</span>
                                  <span className="ml-2 font-medium">${workOrder.estimatedCost}</span>
                                </div>
                              </div>

                              {contractor && (
                                <div className="mb-4 p-3 bg-muted rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                                      {contractor.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                      <div className="font-medium">{contractor.name}</div>
                                      <div className="text-sm text-muted-foreground">{contractor.businessName}</div>
                                    </div>
                                    <div className="ml-auto text-right">
                                      <div className="text-sm font-medium">{contractor.rating}★</div>
                                      <div className="text-xs text-muted-foreground">{contractor.reviewCount} reviews</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Scheduled</div>
                              <div className="text-lg font-bold">{new Date(workOrder.scheduledDate).toLocaleDateString()}</div>
                              <div className="text-sm text-muted-foreground mt-1">{workOrder.estimatedDuration} min</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Materials:</span>
                              <div className="mt-1 space-y-1">
                                {workOrder.materials.map((material, index) => (
                                  <div key={index} className="flex justify-between">
                                    <span className="font-medium">{material.name}</span>
                                    <span className="text-muted-foreground">${material.totalCost}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Actual Cost:</span>
                              <div className="font-medium">${workOrder.actualCost || 'TBD'}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Actual Duration:</span>
                              <div className="font-medium">{workOrder.actualDuration || 'TBD'} min</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Created:</span>
                              <div className="font-medium">{new Date(workOrder.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            {workOrder.status === 'pending' && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => updateWorkOrderStatus(workOrder.id, 'scheduled')}>
                                  Schedule
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => updateWorkOrderStatus(workOrder.id, 'in_progress')}>
                                  Start Work
                                </Button>
                              </>
                            )}
                            {workOrder.status === 'in_progress' && (
                              <Button variant="outline" size="sm" onClick={() => updateWorkOrderStatus(workOrder.id, 'completed')}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Complete
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            {contractor && (
                              <Button variant="outline" size="sm">
                                <Phone className="h-4 w-4 mr-1" />
                                Contact
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
                    <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Work Orders</h3>
                    <p className="text-muted-foreground mb-4">Create work orders to track maintenance tasks.</p>
                    <Button>Create Work Order</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="schedules" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Maintenance Schedules</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Upcoming Tasks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Upcoming Tasks
                    </CardTitle>
                    <CardDescription>Tasks due within 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getScheduledTasks().length > 0 ? (
                      <div className="space-y-3">
                        {getScheduledTasks().map((schedule) => (
                          <div key={schedule.id} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium">{schedule.title}</h4>
                                <p className="text-sm text-muted-foreground">{schedule.description}</p>
                              </div>
                              <Badge className={getPriorityColor(schedule.priority)}>
                                {schedule.priority}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Next due: {new Date(schedule.nextDue).toLocaleDateString()}
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs text-muted-foreground">Frequency: {schedule.frequency}</span>
                              <Button variant="outline" size="sm" className="text-xs">
                                Create Work Order
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No upcoming tasks scheduled
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Overdue Tasks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Overdue Tasks
                    </CardTitle>
                    <CardDescription>Tasks that need immediate attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getOverdueTasks().length > 0 ? (
                      <div className="space-y-3">
                        {getOverdueTasks().map((schedule) => (
                          <div key={schedule.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium text-red-700">{schedule.title}</h4>
                                <p className="text-sm text-red-600">{schedule.description}</p>
                              </div>
                              <Badge className="bg-red-100 text-red-800">
                                Overdue
                              </Badge>
                            </div>
                            <div className="text-sm text-red-600">
                              Overdue since: {new Date(schedule.nextDue).toLocaleDateString()}
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs text-red-600">Frequency: {schedule.frequency}</span>
                              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs">
                                Urgent Action Required
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No overdue tasks
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* All Schedules */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Maintenance Schedules</CardTitle>
                    <CardDescription>Complete maintenance calendar</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {schedules.length > 0 ? (
                      <div className="space-y-3">
                        {schedules.map((schedule) => (
                          <div key={schedule.id} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium">{schedule.title}</h4>
                                <p className="text-sm text-muted-foreground">{schedule.category}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">{schedule.frequency}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div>Last performed: {new Date(schedule.lastPerformed).toLocaleDateString()}</div>
                              <div>Next due: {new Date(schedule.nextDue).toLocaleDateString()}</div>
                              <div>Category: {schedule.category}</div>
                              <div>Estimated cost: ${schedule.estimatedCost}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No maintenance schedules configured
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contractors" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Maintenance Contractors</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contractor
                </Button>
              </div>

              {contractors.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {contractors.map((contractor) => (
                    <Card key={contractor.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {contractor.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">{contractor.name}</h4>
                            <p className="text-sm text-muted-foreground">{contractor.businessName}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="secondary">{contractor.rating}★</Badge>
                              <Badge variant="outline" className="text-xs">{contractor.reviewCount} reviews</Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center space-x-2">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Specializations:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {contractor.specializations.map((specialization, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{specialization}</Badge>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                          <div>License: {contractor.licenseNumber}</div>
                          <div>Insurance: {new Date(contractor.insuranceExpiry).toLocaleDateString()}</div>
                          <div>Response Time: {contractor.averageResponseTime}h</div>
                          <div>Jobs Completed: {contractor.completedJobs}</div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Availability</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {Object.entries(contractor.availability).map(([day, hours]) => (
                              <div key={day} className="flex justify-between">
                                <span className="font-medium">{day}:</span>
                                <span>{hours.start} - {hours.end}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Phone className="h-4 w-4 mr-1" />
                            Contact
                          </Button>
                          <Button variant="outline" size="sm">
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </Button>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Assign Job
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
                    <h3 className="text-lg font-semibold mb-2">No Contractors</h3>
                    <p className="text-muted-foreground mb-4">Add maintenance contractors to your network.</p>
                    <Button>Add Contractor</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Maintenance Analytics</h3>
              
              {analytics ? (
                <div className="grid gap-6">
                  {/* Performance Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Performance Metrics
                      </CardTitle>
                      <CardDescription>Maintenance performance overview</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-6 bg-blue-50 rounded-lg">
                          <div className="text-3xl font-bold text-blue-700">{analytics.metrics.totalRequests}</div>
                          <div className="text-sm text-blue-700">Total Requests</div>
                        </div>
                        <div className="text-center p-6 bg-green-50 rounded-lg">
                          <div className="text-3xl font-bold text-green-700">{analytics.metrics.completedRequests}</div>
                          <div className="text-sm text-green-700">Completed</div>
                        </div>
                        <div className="text-center p-6 bg-orange-50 rounded-lg">
                          <div className="text-3xl font-bold text-orange-700">{analytics.metrics.averageResolutionTime.toFixed(1)}</div>
                          <div className="text-sm text-orange-700">Avg Resolution Time (hrs)</div>
                        </div>
                        <div className="text-center p-6 bg-purple-50 rounded-lg">
                          <div className="text-3xl font-bold text-purple-700">${analytics.metrics.totalCost.toLocaleString()}</div>
                          <div className="text-sm text-purple-700">Total Cost</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Request Trends */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Request Trends</CardTitle>
                      <CardDescription>Monthly maintenance request patterns</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {analytics.trends.requestVolume && (
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <BarChart3 className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Request Volume</span>
                            </div>
                            <div className="text-2xl font-bold text-blue-700">
                              {analytics.trends.requestVolume > 0 ? '+' : ''}{analytics.trends.requestVolume}%
                            </div>
                            <div className="text-sm text-blue-600">from last period</div>
                          </div>
                        )}
                        {analytics.trends.costTrend && (
                          <div className="p-4 bg-green-50 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-medium">Cost Trend</span>
                            </div>
                            <div className="text-2xl font-bold text-green-700">
                              {analytics.trends.costTrend > 0 ? '+' : ''}{analytics.trends.costTrend}%
                            </div>
                            <div className="text-sm text-green-600">from last period</div>
                          </div>
                        )}
                        {analytics.trends.satisfactionTrend && (
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-purple-600" />
                              <span className="font-medium">Satisfaction</span>
                            </div>
                            <div className="text-2xl font-bold text-purple-700">
                              {analytics.trends.satisfactionTrend > 0 ? '+' : ''}{analytics.trends.satisfactionTrend}%
                            </div>
                            <div className="text-sm text-purple-600">from last period</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contractor Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Contractor Performance</CardTitle>
                      <CardDescription>Top performing contractors</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Contractor</TableHead>
                            <TableHead>Jobs Completed</TableHead>
                            <TableHead>Avg Rating</TableHead>
                            <TableHead>On-Time %</TableHead>
                            <TableHead>Total Earnings</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.metrics.contractorPerformance.map((performance, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{performance.contractorId}</TableCell>
                              <TableCell>{performance.jobsCompleted}</TableCell>
                              <TableCell>{performance.averageRating}</TableCell>
                              <TableCell>{performance.onTimePercentage}%</TableCell>
                              <TableCell>${performance.totalEarnings.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Issue Categories */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Issue Categories</CardTitle>
                      <CardDescription>Most common maintenance issues</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {analytics.metrics.recurringIssues.map((issue, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium">{issue.category}</h4>
                              <span className="text-sm text-muted-foreground">{issue.frequency} occurrences</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${(issue.frequency / Math.max(...analytics.metrics.recurringIssues.map(i => i.frequency))) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
                    <p className="text-muted-foreground">Analytics will be available after processing maintenance requests.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reminders" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Maintenance Reminders</h3>
              
              {reminders.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {reminders.map((reminder) => (
                    <Card key={reminder.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className={`w-3 h-3 rounded-full ${reminder.priority === 'urgent' ? 'bg-red-500' : reminder.priority === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}`}></div>
                          <div>
                            <h4 className="font-semibold">{reminder.type}</h4>
                            <p className="text-sm text-muted-foreground">{reminder.message}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                          <div>Due: {new Date(reminder.dueDate).toLocaleDateString()}</div>
                          <div>Priority: {reminder.priority}</div>
                          <div>Status: {reminder.acknowledged ? 'Acknowledged' : 'Pending'}</div>
                          <div>Property: {reminder.propertyId}</div>
                        </div>

                        <div className="flex space-x-2">
                          {!reminder.acknowledged && (
                            <Button variant="outline" size="sm">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            <Calendar className="h-4 w-4 mr-1" />
                            Schedule
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Reminders</h3>
                    <p className="text-muted-foreground">Set up maintenance schedules to receive reminders.</p>
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

export default MaintenanceScheduling;