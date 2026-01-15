import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Users, Shield, BarChart3, AlertTriangle, CheckCircle, Clock, Calendar, MessageSquare, Settings, Globe, Database, Activity, Eye, Edit, Trash2, Plus, Filter, Download, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { AdminUser, PlatformAnalytics, ContentModeration, SystemConfiguration, AuditLog, FinancialReport, NotificationTemplate, SupportTicket, FeatureFlag, BackupStatus, SystemHealth } from '@/types';

const AdminPanel = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // State for admin data
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [platformAnalytics, setPlatformAnalytics] = useState<PlatformAnalytics | null>(null);
  const [contentModeration, setContentModeration] = useState<ContentModeration[]>([]);
  const [systemConfiguration, setSystemConfiguration] = useState<SystemConfiguration[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [financialReports, setFinancialReports] = useState<FinancialReport[]>([]);
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [backupStatus, setBackupStatus] = useState<BackupStatus[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    if (isAuthenticated && user) {
      loadAdminData();
      // Set up real-time monitoring
      const interval = setInterval(() => {
        loadSystemHealth();
      }, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [adminUsersData, platformAnalyticsData, contentModerationData, systemConfigurationData, auditLogsData, financialReportsData, notificationTemplatesData, supportTicketsData, featureFlagsData, backupStatusData, systemHealthData] = await Promise.all([
        apiService.getAdminUsers(),
        apiService.getPlatformAnalytics(),
        apiService.getContentModeration(),
        apiService.getSystemConfiguration(),
        apiService.getAuditLogs(),
        apiService.getFinancialReports(),
        apiService.getNotificationTemplates(),
        apiService.getSupportTickets(),
        apiService.getFeatureFlags(),
        apiService.getBackupStatus(),
        apiService.getSystemHealth()
      ]);
      
      setAdminUsers(adminUsersData);
      setPlatformAnalytics(platformAnalyticsData);
      setContentModeration(contentModerationData);
      setSystemConfiguration(systemConfigurationData);
      setAuditLogs(auditLogsData);
      setFinancialReports(financialReportsData);
      setNotificationTemplates(notificationTemplatesData);
      setSupportTickets(supportTicketsData);
      setFeatureFlags(featureFlagsData);
      setBackupStatus(backupStatusData);
      setSystemHealth(systemHealthData);
    } catch (error) {
      toast({
        title: "Error loading admin data",
        description: "Failed to load administrative information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const health = await apiService.getSystemHealth();
      setSystemHealth(health);
    } catch (error) {
      console.error("Failed to load system health:", error);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      setLoading(true);
      await apiService.updateUserRole(userId, role);
      setAdminUsers(adminUsers.map(u => u.id === userId ? {...u, role} : u));
      toast({
        title: "Role Updated",
        description: "User role has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      setLoading(true);
      await apiService.toggleUserStatus(userId, !isActive);
      setAdminUsers(adminUsers.map(u => u.id === userId ? {...u, isActive: !isActive} : u));
      toast({
        title: "Status Updated",
        description: `User has been ${isActive ? 'deactivated' : 'activated'}.`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update user status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveContentModeration = async (moderationId: string, action: string) => {
    try {
      setLoading(true);
      await apiService.resolveContentModeration(moderationId, action);
      setContentModeration(contentModeration.map(m => m.id === moderationId ? {...m, status: action} : m));
      toast({
        title: "Content Moderated",
        description: `Content has been ${action}.`,
      });
    } catch (error) {
      toast({
        title: "Moderation Failed",
        description: "Failed to moderate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSystemConfig = async (configId: string, value: any) => {
    try {
      setLoading(true);
      await apiService.updateSystemConfiguration(configId, value);
      setSystemConfiguration(systemConfiguration.map(c => c.id === configId ? {...c, value} : c));
      toast({
        title: "Configuration Updated",
        description: "System configuration has been updated.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthStatusColor = (status: string) => {
    return status === 'healthy' ? 'bg-green-500' : 'bg-red-500';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">System administration and platform management</p>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to access admin panel.</p>
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Platform Metrics */}
              {platformAnalytics && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Total Users
                      </CardTitle>
                      <CardDescription>{platformAnalytics.period}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{platformAnalytics.metrics.totalUsers.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {platformAnalytics.trends.userGrowth > 0 ? '+' : ''}{platformAnalytics.trends.userGrowth}% from last period
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Active Users
                      </CardTitle>
                      <CardDescription>{platformAnalytics.period}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{platformAnalytics.metrics.activeUsers.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {platformAnalytics.trends.engagementRate > 0 ? '+' : ''}{platformAnalytics.trends.engagementRate}% engagement
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <DollarSign className="h-5 w-5 mr-2" />
                        Revenue
                      </CardTitle>
                      <CardDescription>{platformAnalytics.period}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">${(platformAnalytics.metrics.revenue / 1000000).toFixed(1)}M</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {platformAnalytics.trends.revenueGrowth > 0 ? '+' : ''}{platformAnalytics.trends.revenueGrowth}% growth
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Activity className="h-5 w-5 mr-2" />
                        Transactions
                      </CardTitle>
                      <CardDescription>{platformAnalytics.period}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{platformAnalytics.metrics.totalTransactions.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {platformAnalytics.trends.conversionRate > 0 ? '+' : ''}{platformAnalytics.trends.conversionRate}% conversion
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* System Health */}
            {systemHealth && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    System Health
                  </CardTitle>
                  <CardDescription>Real-time system status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {systemHealth.services.map((service) => (
                      <div key={service.name} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{service.name}</span>
                          <div className={`w-3 h-3 rounded-full ${getHealthStatusColor(service.status)}`}></div>
                        </div>
                        <div className="text-sm text-muted-foreground">Uptime: {service.uptime}%</div>
                        <div className="text-sm text-muted-foreground">Response: {service.responseTime}ms</div>
                      </div>
                    ))}
                  </div>

                  {/* Infrastructure Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">CPU Usage</div>
                      <div className="text-2xl font-bold">{systemHealth.infrastructure.cpu}%</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Memory Usage</div>
                      <div className="text-2xl font-bold">{systemHealth.infrastructure.memory}%</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Disk Usage</div>
                      <div className="text-2xl font-bold">{systemHealth.infrastructure.disk}%</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Network</div>
                      <div className="text-2xl font-bold">{systemHealth.infrastructure.network}%</div>
                    </div>
                  </div>

                  {/* Alerts */}
                  {systemHealth.alerts.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {systemHealth.alerts.map((alert) => (
                        <div key={alert.id} className={`p-3 border rounded-lg ${alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <span className={`w-3 h-3 rounded-full ${alert.severity === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                              <span className="font-medium">{alert.title}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">{alert.createdAt}</div>
                          </div>
                          <p className="text-sm mt-1">{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Admin Users</CardTitle>
                  <CardDescription>Manage administrative users and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminUsers.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium">{admin.name}</TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>
                            <Select value={admin.role} onValueChange={(value) => updateUserRole(admin.id, value)}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(admin.isActive ? 'active' : 'inactive')}>
                              {admin.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(admin.lastLogin).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => toggleUserStatus(admin.id, admin.isActive)}>
                                {admin.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
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
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Content Moderation</h3>
              
              {contentModeration.length > 0 ? (
                <div className="space-y-4">
                  {contentModeration.map((moderation) => (
                    <Card key={moderation.id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-semibold">{moderation.contentType}: {moderation.contentId}</h4>
                            <p className="text-sm text-muted-foreground">Reported by: {moderation.reportedBy}</p>
                          </div>
                          <Badge className={getStatusColor(moderation.status)}>
                            {moderation.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Reason:</span>
                            <p className="mt-1">{moderation.reason}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Priority:</span>
                            <Badge className={getSeverityColor(moderation.priority)}>
                              {moderation.priority}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Assigned to:</span>
                            <p className="mt-1">{moderation.assignedTo || 'Unassigned'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Created:</span>
                            <p className="mt-1">{new Date(moderation.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {moderation.notes.length > 0 && (
                          <div className="mb-4">
                            <span className="text-sm text-muted-foreground">Notes</span>
                            <div className="space-y-2 mt-2">
                              {moderation.notes.map((note, index) => (
                                <div key={index} className="p-2 bg-muted rounded text-sm">
                                  <div className="font-medium">{note.author}</div>
                                  <div className="text-muted-foreground">{note.note}</div>
                                  <div className="text-xs text-muted-foreground mt-1">{new Date(note.createdAt).toLocaleString()}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => resolveContentModeration(moderation.id, 'approved')}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => resolveContentModeration(moderation.id, 'rejected')}>
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Moderation Items</h3>
                    <p className="text-muted-foreground">All content is currently approved.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">System Configuration</h3>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {systemConfiguration.map((config) => (
                  <Card key={config.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{config.key}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label>Value</Label>
                          {config.type === 'boolean' ? (
                            <div className="flex items-center space-x-2 mt-2">
                              <input
                                type="checkbox"
                                checked={config.value}
                                onChange={(e) => updateSystemConfig(config.id, e.target.checked)}
                                className="rounded"
                              />
                              <span>{config.value ? 'Enabled' : 'Disabled'}</span>
                            </div>
                          ) : config.type === 'number' ? (
                            <Input
                              type="number"
                              value={config.value}
                              onChange={(e) => updateSystemConfig(config.id, parseInt(e.target.value))}
                              className="mt-2"
                            />
                          ) : (
                            <Input
                              value={config.value}
                              onChange={(e) => updateSystemConfig(config.id, e.target.value)}
                              className="mt-2"
                            />
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>Category: {config.category}</div>
                          <div>Type: {config.type}</div>
                          <div>Public: {config.isPublic ? 'Yes' : 'No'}</div>
                          <div>Modified: {new Date(config.lastModified).toLocaleDateString()}</div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Modified by: {config.modifiedBy}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Audit Logs</h3>
              
              <Card>
                <CardHeader>
                  <CardTitle>Audit Trail</CardTitle>
                  <CardDescription>System activity and user actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Severity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.userId}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>{log.resource}</TableCell>
                          <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                          <TableCell>{log.ipAddress}</TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(log.severity)}>
                              {log.severity}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Financial Reports</h3>
                <div className="flex space-x-2">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {financialReports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <CardTitle>{report.period}</CardTitle>
                      <CardDescription>{report.type} Report</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-700">
                            ${report.data.totalAmount.toLocaleString()}
                          </div>
                          <div className="text-sm text-green-700">Total Revenue</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Transactions:</span>
                            <span className="ml-2 font-medium">{report.data.transactionCount}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg Amount:</span>
                            <span className="ml-2 font-medium">${report.data.averageAmount}</span>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="support" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Support Tickets</h3>
              
              {supportTickets.length > 0 ? (
                <div className="space-y-4">
                  {supportTickets.map((ticket) => (
                    <Card key={ticket.id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-semibold">{ticket.subject}</h4>
                            <p className="text-sm text-muted-foreground">User: {ticket.userId}</p>
                          </div>
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Category:</span>
                            <span className="ml-2 font-medium">{ticket.category}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Priority:</span>
                            <Badge className={getSeverityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Assigned to:</span>
                            <span className="ml-2 font-medium">{ticket.assignedTo || 'Unassigned'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Created:</span>
                            <span className="ml-2 font-medium">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <span className="text-sm text-muted-foreground">Description</span>
                          <p className="mt-2 text-sm">{ticket.messages[0]?.message}</p>
                        </div>

                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Respond
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Update Status
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Support Tickets</h3>
                    <p className="text-muted-foreground">All support requests have been resolved.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="system" className="mt-6">
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Feature Flags */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      Feature Flags
                    </CardTitle>
                    <CardDescription>Toggle features and A/B tests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {featureFlags.map((flag) => (
                        <div key={flag.id} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <div className="font-medium">{flag.name}</div>
                            <div className="text-sm text-muted-foreground">{flag.description}</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{flag.rolloutPercentage}%</span>
                            <input
                              type="checkbox"
                              checked={flag.enabled}
                              onChange={(e) => {
                                // Update feature flag logic would go here
                              }}
                              className="rounded"
                            />
                          </div>
                        </div>
                      ))}
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
                    <CardDescription>System backup and recovery</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {backupStatus.map((backup) => (
                        <div key={backup.id} className="p-3 border rounded">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{backup.type} Backup</span>
                            <Badge className={getStatusColor(backup.status)}>
                              {backup.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Last: {new Date(backup.completedAt || backup.startedAt).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Size: {(backup.size / (1024 * 1024 * 1024)).toFixed(2)} GB
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AdminPanel;