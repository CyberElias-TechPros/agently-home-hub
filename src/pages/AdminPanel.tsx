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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, BarChart3, Shield, Settings, FileText, AlertTriangle, DollarSign, Activity, Database, Server, Eye, Edit, Trash2, CheckCircle, XCircle, Clock, TrendingUp, UserCheck, MessageSquare, Flag, Download, Lock } from 'lucide-react';
import { mockAdminUsers, mockPlatformAnalytics, mockContentModeration, mockSystemConfiguration, mockAuditLogs, mockFinancialReports, mockNotificationTemplates, mockSupportTickets, mockFeatureFlags, mockBackupStatus, mockSystemHealth } from '@/lib/mockData';
import type { AdminUser, PlatformAnalytics, ContentModeration, SystemConfiguration, AuditLog, FinancialReport, NotificationTemplate, SupportTicket, FeatureFlag, BackupStatus, SystemHealth } from '@/types';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">Platform management and oversight dashboard</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="grid gap-6">
            {/* Key Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockPlatformAnalytics.metrics.totalUsers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    +{mockPlatformAnalytics.trends.userGrowth}% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockPlatformAnalytics.metrics.activeListings.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {mockPlatformAnalytics.metrics.totalProperties} total properties
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(mockPlatformAnalytics.metrics.revenue / 1000000).toFixed(1)}M</div>
                  <p className="text-xs text-muted-foreground">
                    +{mockPlatformAnalytics.trends.revenueGrowth}% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Health</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">98.5%</div>
                  <p className="text-xs text-muted-foreground">
                    All services operational
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Alerts */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest admin actions and system events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockAuditLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-center space-x-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{log.action.replace('_', ' ')}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.userId} • {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={getSeverityColor(log.severity)}>
                          {log.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Alerts</CardTitle>
                  <CardDescription>Active system alerts and notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockSystemHealth.alerts.map((alert) => (
                      <div key={alert.id} className="flex items-start space-x-4">
                        <AlertTriangle className={`h-5 w-5 mt-0.5 ${alert.severity === 'critical' ? 'text-red-500' : alert.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!alert.acknowledged && (
                          <Button size="sm" variant="outline">Acknowledge</Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <Users className="h-6 w-6 mb-2" />
                    Manage Users
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Shield className="h-6 w-6 mb-2" />
                    Content Moderation
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <BarChart3 className="h-6 w-6 mb-2" />
                    View Analytics
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <Settings className="h-6 w-6 mb-2" />
                    System Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Admin Users
                </CardTitle>
                <CardDescription>Manage administrative user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="mb-4">
                  <Users className="h-4 w-4 mr-2" />
                  Add Admin User
                </Button>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockAdminUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>{new Date(user.lastLogin).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Flag className="h-5 w-5 mr-2" />
                  Content Moderation Queue
                </CardTitle>
                <CardDescription>Review and moderate reported content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockContentModeration.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline">{item.contentType}</Badge>
                              <Badge className={getSeverityColor(item.priority)}>
                                {item.priority}
                              </Badge>
                              <Badge className={getStatusColor(item.status)}>
                                {item.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="font-medium">{item.reason}</p>
                            <p className="text-sm text-muted-foreground">
                              Reported by: {item.reportedBy} • {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">Review</Button>
                            <Button size="sm" variant="outline">View Content</Button>
                          </div>
                        </div>

                        {item.notes.length > 0 && (
                          <div className="border-t pt-4">
                            <p className="text-sm font-medium mb-2">Notes</p>
                            <div className="space-y-2">
                              {item.notes.map((note) => (
                                <div key={note.id} className="text-sm">
                                  <span className="font-medium">{note.author}:</span> {note.note}
                                  <span className="text-muted-foreground ml-2">
                                    {new Date(note.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {mockPlatformAnalytics && (
            <div className="grid gap-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>User Demographics</CardTitle>
                    <CardDescription>User distribution by role and location</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">By Role</p>
                        {mockPlatformAnalytics.demographics.userByRole.map((role, index) => (
                          <div key={index} className="flex justify-between items-center mb-2">
                            <span className="text-sm capitalize">{role.role}</span>
                            <span className="text-sm font-medium">{role.count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">By Location</p>
                        {mockPlatformAnalytics.demographics.userByLocation.map((location, index) => (
                          <div key={index} className="flex justify-between items-center mb-2">
                            <span className="text-sm">{location.location}</span>
                            <span className="text-sm font-medium">{location.count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Device Types</CardTitle>
                    <CardDescription>User device preferences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockPlatformAnalytics.demographics.deviceTypes.map((device, index) => (
                        <div key={index}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm">{device.device}</span>
                            <span className="text-sm font-medium">{device.percentage}%</span>
                          </div>
                          <Progress value={device.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <div className="grid gap-6">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  System Health
                </CardTitle>
                <CardDescription>Monitor service status and infrastructure</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {mockSystemHealth.services.map((service) => (
                    <div key={service.name} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{service.name}</span>
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`} />
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>Uptime: {service.uptime}%</div>
                        <div>Response: {service.responseTime}ms</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-4">Infrastructure Metrics</h4>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">CPU Usage</p>
                      <p className="text-2xl font-bold">{mockSystemHealth.infrastructure.cpu}%</p>
                      <Progress value={mockSystemHealth.infrastructure.cpu} className="mt-2" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Memory Usage</p>
                      <p className="text-2xl font-bold">{mockSystemHealth.infrastructure.memory}%</p>
                      <Progress value={mockSystemHealth.infrastructure.memory} className="mt-2" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Disk Usage</p>
                      <p className="text-2xl font-bold">{mockSystemHealth.infrastructure.disk}%</p>
                      <Progress value={mockSystemHealth.infrastructure.disk} className="mt-2" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Network Usage</p>
                      <p className="text-2xl font-bold">{mockSystemHealth.infrastructure.network}%</p>
                      <Progress value={mockSystemHealth.infrastructure.network} className="mt-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Backup Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Backup Status
                </CardTitle>
                <CardDescription>Recent backup operations and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockBackupStatus.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(backup.status)}`} />
                        <div>
                          <p className="font-medium capitalize">{backup.type} Backup</p>
                          <p className="text-sm text-muted-foreground">
                            {backup.size ? `${(backup.size / 1073741824).toFixed(1)}GB` : 'Size unknown'} • 
                            Retention: {backup.retention} days
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {backup.completedAt ? 
                            `Completed ${new Date(backup.completedAt).toLocaleString()}` : 
                            `Started ${new Date(backup.startedAt).toLocaleString()}`
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Financial Reports
                </CardTitle>
                <CardDescription>Revenue, commissions, and financial analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {mockFinancialReports.map((report) => (
                    <Card key={report.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg capitalize">{report.type} Report</CardTitle>
                            <CardDescription>{report.period}</CardDescription>
                          </div>
                          <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Amount</p>
                            <p className="text-2xl font-bold">${report.data.totalAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Transactions</p>
                            <p className="text-2xl font-bold">{report.data.transactionCount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Average Amount</p>
                            <p className="text-2xl font-bold">${report.data.averageAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Generated</p>
                            <p className="text-sm">{new Date(report.generatedAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-3">Revenue Breakdown</p>
                          <div className="space-y-2">
                            {report.data.breakdown.map((item, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <span className="text-sm">{item.category}</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full"
                                      style={{ width: `${item.percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium w-16 text-right">
                                    ${item.amount.toLocaleString()}
                                  </span>
                                  <span className="text-sm text-muted-foreground w-12 text-right">
                                    {item.percentage}%
                                  </span>
                                </div>
                              </div>
                            ))}
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

        <TabsContent value="support" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Support Tickets
                </CardTitle>
                <CardDescription>Manage customer support requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockSupportTickets.map((ticket) => (
                    <Card key={ticket.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline">{ticket.category}</Badge>
                              <Badge className={getSeverityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <h4 className="font-semibold">{ticket.subject}</h4>
                            <p className="text-sm text-muted-foreground">
                              User: {ticket.userId} • Created: {new Date(ticket.createdAt).toLocaleDateString()}
                              {ticket.assignedTo && ` • Assigned to: ${ticket.assignedTo}`}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">View</Button>
                            <Button size="sm">Respond</Button>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {ticket.messages.length} messages • Last updated: {new Date(ticket.updatedAt).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="grid gap-6">
            {/* System Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  System Configuration
                </CardTitle>
                <CardDescription>Manage platform settings and configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockSystemConfiguration.map((config) => (
                    <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{config.key.replace('_', ' ')}</span>
                          <Badge variant="outline" className="text-xs">{config.category}</Badge>
                          {!config.isPublic && <Lock className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last modified: {new Date(config.lastModified).toLocaleDateString()} by {config.modifiedBy}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {config.type === 'boolean' ? (config.value ? 'Enabled' : 'Disabled') : String(config.value)}
                        </span>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Feature Flags */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
                <CardDescription>Control feature rollout and testing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockFeatureFlags.map((flag) => (
                    <div key={flag.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{flag.name}</span>
                          {flag.enabled ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{flag.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <span>Rollout: {flag.rolloutPercentage}%</span>
                          {flag.targetUsers.length > 0 && (
                            <span>Target: {flag.targetUsers.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4 mr-1" />
                        Configure
                      </Button>
                    </div>
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

export default AdminPanel;