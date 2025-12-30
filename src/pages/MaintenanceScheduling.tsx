import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, DollarSign, Wrench, AlertTriangle, CheckCircle, User, FileText, TrendingUp, BarChart3, Plus } from 'lucide-react';
import { mockWorkOrders, mockMaintenanceSchedules, mockContractors, mockMaintenanceAnalytics, mockMaintenanceReminders, mockInspectionChecklists, mockMaintenanceRequests } from '@/lib/mockData';
import type { WorkOrder, MaintenanceSchedule, ContractorProfile, MaintenanceAnalytics, MaintenanceReminder, InspectionChecklist } from '@/types';

const MaintenanceScheduling = () => {
  const [activeTab, setActiveTab] = useState('work-orders');
  const [selectedProperty, setSelectedProperty] = useState<string>('1');

  const propertyWorkOrders = mockWorkOrders.filter(wo => wo.propertyId === selectedProperty);
  const propertySchedules = mockMaintenanceSchedules.filter(ms => ms.propertyId === selectedProperty);
  const propertyReminders = mockMaintenanceReminders.filter(mr => mr.propertyId === selectedProperty);
  const propertyInspections = mockInspectionChecklists.filter(ic => ic.propertyId === selectedProperty);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'scheduled': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'on_hold': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'emergency': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Maintenance Scheduling</h1>
        <p className="text-muted-foreground">Comprehensive property maintenance management and scheduling</p>
      </div>

      {/* Property Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Select Property:</label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">123 Main Street, San Francisco</SelectItem>
                <SelectItem value="2">456 Tower Plaza, New York</SelectItem>
                <SelectItem value="3">789 College Ave, Boston</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
          <TabsTrigger value="schedule">Maintenance Schedule</TabsTrigger>
          <TabsTrigger value="contractors">Contractors</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="work-orders" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wrench className="h-5 w-5 mr-2" />
                  Work Orders
                </CardTitle>
                <CardDescription>Manage maintenance work orders and repairs</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="mb-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Work Order
                </Button>

                <div className="space-y-4">
                  {propertyWorkOrders.map((workOrder) => {
                    const contractor = mockContractors.find(c => c.id === workOrder.assignedContractorId);
                    return (
                      <Card key={workOrder.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{workOrder.title}</CardTitle>
                              <CardDescription>{workOrder.description}</CardDescription>
                            </div>
                            <div className="flex space-x-2">
                              <Badge className={getPriorityColor(workOrder.priority)}>
                                {workOrder.priority}
                              </Badge>
                              <Badge className={getStatusColor(workOrder.status)}>
                                {workOrder.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Category</p>
                              <p className="font-medium capitalize">{workOrder.category.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Estimated Cost</p>
                              <p className="font-medium">${workOrder.estimatedCost}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Duration</p>
                              <p className="font-medium">{workOrder.estimatedDuration} hours</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Contractor</p>
                              <p className="font-medium">{contractor?.name || 'Unassigned'}</p>
                            </div>
                          </div>

                          {workOrder.scheduledDate && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground">Scheduled</p>
                              <p className="font-medium">
                                {new Date(workOrder.scheduledDate).toLocaleDateString()} at {new Date(workOrder.scheduledDate).toLocaleTimeString()}
                              </p>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <div className="text-sm text-muted-foreground">
                              Created: {new Date(workOrder.createdAt).toLocaleDateString()}
                              {workOrder.updatedAt !== workOrder.createdAt && (
                                <span className="ml-2">
                                  • Updated: {new Date(workOrder.updatedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">Update Status</Button>
                              <Button variant="outline" size="sm">View Details</Button>
                              <Button size="sm">Edit</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Maintenance Schedule
                </CardTitle>
                <CardDescription>Preventive maintenance and recurring tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="mb-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Scheduled Maintenance
                </Button>

                <div className="space-y-4">
                  {propertySchedules.map((schedule) => {
                    const contractor = mockContractors.find(c => c.id === schedule.assignedContractorId);
                    const isOverdue = new Date(schedule.nextDue) < new Date() && schedule.status !== 'completed';

                    return (
                      <Card key={schedule.id} className={isOverdue ? 'border-red-200 bg-red-50' : ''}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg flex items-center">
                                {schedule.title}
                                {isOverdue && <AlertTriangle className="h-5 w-5 text-red-500 ml-2" />}
                              </CardTitle>
                              <CardDescription>{schedule.description}</CardDescription>
                            </div>
                            <div className="flex space-x-2">
                              <Badge className={getPriorityColor(schedule.priority)}>
                                {schedule.priority}
                              </Badge>
                              <Badge variant={schedule.status === 'overdue' ? 'destructive' : 'secondary'}>
                                {schedule.status}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Frequency</p>
                              <p className="font-medium capitalize">{schedule.frequency.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Category</p>
                              <p className="font-medium capitalize">{schedule.category}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Estimated Cost</p>
                              <p className="font-medium">${schedule.estimatedCost}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Next Due</p>
                              <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                                {new Date(schedule.nextDue).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {schedule.lastPerformed && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground">Last Performed</p>
                              <p className="font-medium">{new Date(schedule.lastPerformed).toLocaleDateString()}</p>
                            </div>
                          )}

                          {contractor && (
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground">Assigned Contractor</p>
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback>{contractor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{contractor.name}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">Schedule Now</Button>
                            <Button variant="outline" size="sm">Mark Complete</Button>
                            <Button size="sm">Edit</Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contractors" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {mockContractors.map((contractor) => (
              <Card key={contractor.id}>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src="" />
                      <AvatarFallback>{contractor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{contractor.businessName}</CardTitle>
                      <CardDescription>{contractor.name}</CardDescription>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{contractor.rating} stars</span>
                        </div>
                        <span className="text-sm text-muted-foreground">({contractor.reviewCount} reviews)</span>
                        <Badge variant="secondary" className="text-xs">
                          {contractor.completedJobs} jobs
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Specializations</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {contractor.specializations.slice(0, 3).map((spec, index) => (
                          <Badge key={index} variant="outline" className="text-xs">{spec}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Response Time</p>
                        <p className="font-medium">{contractor.averageResponseTime} hours</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">License</p>
                        <p className="font-medium">{contractor.licenseNumber}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" className="flex-1">View Profile</Button>
                    <Button className="flex-1">Hire Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="inspections" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Property Inspections
                </CardTitle>
                <CardDescription>Scheduled and completed property inspections</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="mb-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Inspection
                </Button>

                <div className="space-y-4">
                  {propertyInspections.map((inspection) => (
                    <Card key={inspection.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg capitalize">
                              {inspection.inspectionType.replace('_', ' ')} Inspection
                            </CardTitle>
                            <CardDescription>
                              Scheduled: {new Date(inspection.scheduledDate).toLocaleDateString()}
                              {inspection.completedDate && (
                                <span className="ml-2">
                                  • Completed: {new Date(inspection.completedDate).toLocaleDateString()}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex space-x-2">
                            <Badge variant={inspection.status === 'completed' ? 'default' : 'secondary'}>
                              {inspection.status.replace('_', ' ')}
                            </Badge>
                            <Badge className={getConditionColor(inspection.overallCondition)}>
                              {inspection.overallCondition}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Inspection Items</p>
                            <div className="space-y-2">
                              {inspection.items.slice(0, 3).map((item) => (
                                <div key={item.id} className="flex justify-between items-center">
                                  <span className="text-sm">{item.category}: {item.item}</span>
                                  <Badge className={getConditionColor(item.condition)} variant="outline">
                                    {item.condition.replace('_', ' ')}
                                  </Badge>
                                </div>
                              ))}
                              {inspection.items.length > 3 && (
                                <p className="text-sm text-muted-foreground">
                                  +{inspection.items.length - 3} more items
                                </p>
                              )}
                            </div>
                          </div>

                          {inspection.notes && (
                            <div>
                              <p className="text-sm text-muted-foreground">Notes</p>
                              <p className="text-sm">{inspection.notes}</p>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">View Full Report</Button>
                            <Button variant="outline" size="sm">Download PDF</Button>
                            {inspection.status !== 'completed' && (
                              <Button size="sm">Mark Complete</Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {mockMaintenanceAnalytics && (
            <div className="grid gap-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{mockMaintenanceAnalytics.metrics.totalRequests}</div>
                    <p className="text-xs text-muted-foreground">
                      {mockMaintenanceAnalytics.metrics.completedRequests} completed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{mockMaintenanceAnalytics.metrics.averageResolutionTime}d</div>
                    <p className="text-xs text-muted-foreground">
                      Days to complete
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${mockMaintenanceAnalytics.metrics.totalCost.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Maintenance expenses
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Emergency Requests</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{mockMaintenanceAnalytics.metrics.emergencyRequests}</div>
                    <p className="text-xs text-muted-foreground">
                      Urgent repairs needed
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recurring Issues</CardTitle>
                    <CardDescription>Most common maintenance problems</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mockMaintenanceAnalytics.metrics.recurringIssues.map((issue, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{issue.category}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(issue.frequency / Math.max(...mockMaintenanceAnalytics.metrics.recurringIssues.map(i => i.frequency))) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{issue.frequency}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Contractor Performance</CardTitle>
                    <CardDescription>Ratings and completion rates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockMaintenanceAnalytics.metrics.contractorPerformance.map((contractor, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>C{index + 1}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">Contractor {index + 1}</p>
                              <p className="text-xs text-muted-foreground">
                                {contractor.jobsCompleted} jobs • {contractor.onTimePercentage}% on time
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium">{contractor.averageRating}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Maintenance Reminders
                </CardTitle>
                <CardDescription>Upcoming and overdue maintenance tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {propertyReminders.map((reminder) => (
                    <Card key={reminder.id} className={!reminder.acknowledged ? 'border-orange-200 bg-orange-50' : ''}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertTriangle className={`h-5 w-5 ${reminder.priority === 'high' ? 'text-red-500' : 'text-orange-500'}`} />
                              <Badge variant={reminder.priority === 'high' ? 'destructive' : 'secondary'}>
                                {reminder.type}
                              </Badge>
                              {!reminder.acknowledged && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                  Unacknowledged
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium mb-1">{reminder.message}</p>
                            <p className="text-sm text-muted-foreground">
                              Due: {new Date(reminder.dueDate).toLocaleDateString()}
                              {reminder.sentDate && (
                                <span className="ml-2">
                                  • Sent: {new Date(reminder.sentDate).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            {!reminder.acknowledged && (
                              <Button size="sm" variant="outline">Acknowledge</Button>
                            )}
                            <Button size="sm">Schedule Now</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MaintenanceScheduling;