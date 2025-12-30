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
import { Calendar, Users, TrendingUp, Award, BookOpen, Star, DollarSign, Clock, CheckCircle, AlertTriangle, Target, BarChart3 } from 'lucide-react';
import { mockAgents, mockLeads, mockAppointments, mockCommissions, mockAgentAnalytics, mockTrainingModules, mockAgentCertifications } from '@/lib/mockData';
import type { Agent, Lead, Appointment, Commission, AgentAnalytics, TrainingModule, AgentCertification } from '@/types';

const AgentCRM = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAgent, setSelectedAgent] = useState<string>('1');

  const currentAgent = mockAgents.find(a => a.id === selectedAgent);
  const agentLeads = mockLeads.filter(l => l.agentId === selectedAgent);
  const agentAppointments = mockAppointments.filter(a => a.agentId === selectedAgent);
  const agentCommissions = mockCommissions.filter(c => c.agentId === selectedAgent);
  const agentAnalytics = mockAgentAnalytics.find(a => a.agentId === selectedAgent);
  const agentCertifications = mockAgentCertifications.filter(c => c.agentId === selectedAgent);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500';
      case 'contacted': return 'bg-yellow-500';
      case 'qualified': return 'bg-green-500';
      case 'proposal': return 'bg-purple-500';
      case 'negotiation': return 'bg-orange-500';
      case 'closed': return 'bg-emerald-500';
      case 'lost': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Agent CRM Dashboard</h1>
        <p className="text-muted-foreground">Professional real estate agent management and lead tracking</p>
      </div>

      {/* Agent Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Select Agent:</label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mockAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name} - {agent.brokerage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          {currentAgent && agentAnalytics && (
            <div className="grid gap-6">
              {/* Agent Profile Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={currentAgent.profilePicture} />
                      <AvatarFallback>{currentAgent.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{currentAgent.name}</CardTitle>
                      <CardDescription>{currentAgent.brokerage}</CardDescription>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{currentAgent.rating}</span>
                          <span className="text-sm text-muted-foreground">({currentAgent.reviewCount} reviews)</span>
                        </div>
                        {currentAgent.verified && (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{currentAgent.experience}</div>
                      <p className="text-xs text-muted-foreground">Years Experience</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{currentAgent.closedDeals}</div>
                      <p className="text-xs text-muted-foreground">Closed Deals</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{currentAgent.activeListings}</div>
                      <p className="text-xs text-muted-foreground">Active Listings</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">${(currentAgent.totalCommission / 1000).toFixed(0)}K</div>
                      <p className="text-xs text-muted-foreground">Total Commission</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{agentAnalytics.metrics.conversionRate}%</div>
                    <Progress value={agentAnalytics.metrics.conversionRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Close Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{agentAnalytics.metrics.closeRate}%</div>
                    <Progress value={agentAnalytics.metrics.closeRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${(agentAnalytics.metrics.averageDealSize / 1000).toFixed(0)}K</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      +12% from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Client Rating</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{agentAnalytics.clientSatisfaction.averageRating}/5</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {agentAnalytics.clientSatisfaction.reviewCount} reviews
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest leads, appointments, and deals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {agentLeads.slice(0, 3).map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{lead.clientName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{lead.clientName}</p>
                            <p className="text-xs text-muted-foreground">{lead.propertyType} • ${lead.budget.min.toLocaleString()} - ${lead.budget.max.toLocaleString()}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Lead Management
                </CardTitle>
                <CardDescription>Track and manage your real estate leads</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="mb-4">Add New Lead</Button>

                <div className="space-y-4">
                  {agentLeads.map((lead) => (
                    <div key={lead.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{lead.clientName}</h4>
                          <p className="text-sm text-muted-foreground">{lead.clientEmail} • {lead.clientPhone}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Badge className={getPriorityColor(lead.priority)}>
                            {lead.priority}
                          </Badge>
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Property Type</p>
                          <p className="font-medium">{lead.propertyType}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Budget</p>
                          <p className="font-medium">${lead.budget.min.toLocaleString()} - ${lead.budget.max.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="font-medium">{lead.location}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Source</p>
                          <p className="font-medium capitalize">{lead.source.replace('_', ' ')}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          Last contact: {new Date(lead.lastContact).toLocaleDateString()}
                          {lead.nextFollowUp && (
                            <span className="ml-2">
                              • Next follow-up: {new Date(lead.nextFollowUp).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">Update Status</Button>
                          <Button variant="outline" size="sm">Schedule Meeting</Button>
                          <Button size="sm">View Details</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Appointment Calendar
                </CardTitle>
                <CardDescription>Manage your client appointments and showings</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="mb-4">Schedule New Appointment</Button>

                <div className="space-y-4">
                  {agentAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{appointment.clientName}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{appointment.type.replace('_', ' ')}</p>
                        </div>
                        <Badge variant={
                          appointment.status === 'confirmed' ? 'default' :
                          appointment.status === 'completed' ? 'secondary' :
                          appointment.status === 'cancelled' ? 'destructive' : 'outline'
                        }>
                          {appointment.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Duration:</span>
                          <span className="text-sm ml-1">{appointment.duration} minutes</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="text-sm">{appointment.location}</p>
                      </div>

                      {appointment.notes && (
                        <div className="mb-3">
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="text-sm">{appointment.notes}</p>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Reschedule</Button>
                        <Button variant="outline" size="sm">Send Reminder</Button>
                        <Button size="sm">Mark Complete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commissions" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Commission Tracking
                </CardTitle>
                <CardDescription>Monitor your earnings and commission payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${(agentCommissions.reduce((sum, c) => sum + c.commissionAmount, 0) / 1000).toFixed(0)}K
                    </div>
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      ${(agentCommissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commissionAmount, 0) / 1000).toFixed(0)}K
                    </div>
                    <p className="text-sm text-muted-foreground">Paid</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      ${(agentCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commissionAmount, 0) / 1000).toFixed(0)}K
                    </div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {agentCommissions.map((commission) => (
                    <div key={commission.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">Deal #{commission.dealId}</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {commission.dealType} • {commission.commissionRate}% commission
                          </p>
                        </div>
                        <Badge variant={
                          commission.status === 'paid' ? 'default' :
                          commission.status === 'pending' ? 'secondary' :
                          commission.status === 'calculated' ? 'outline' : 'destructive'
                        }>
                          {commission.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Base Price</p>
                          <p className="font-semibold">${commission.basePrice.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Commission Amount</p>
                          <p className="font-semibold text-green-600">${commission.commissionAmount.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Earned: {new Date(commission.earnedAt).toLocaleDateString()}</span>
                        {commission.paidAt && (
                          <span>Paid: {new Date(commission.paidAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="training" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Training Modules
                </CardTitle>
                <CardDescription>Continue your professional development</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {mockTrainingModules.map((module) => (
                    <div key={module.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{module.title}</h4>
                          <p className="text-sm text-muted-foreground">{module.description}</p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {module.difficulty}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center text-sm mb-3">
                        <span className="text-muted-foreground">
                          {module.duration} minutes • {module.category}
                        </span>
                        <span className="text-muted-foreground">
                          {module.completionRate}% completion rate
                        </span>
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          Start Module
                        </Button>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="certifications" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Professional Certifications
                </CardTitle>
                <CardDescription>Your credentials and continuing education</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agentCertifications.map((cert) => (
                    <div key={cert.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{cert.certificationName}</h4>
                          <p className="text-sm text-muted-foreground">{cert.issuingBody}</p>
                        </div>
                        <Badge variant={
                          cert.status === 'active' ? 'default' :
                          cert.status === 'expired' ? 'destructive' : 'secondary'
                        }>
                          {cert.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Issued</p>
                          <p className="font-medium">{new Date(cert.issueDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Expires</p>
                          <p className="font-medium">{new Date(cert.expiryDate).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {cert.continuingEducation} hours required annually
                        </span>
                        <Button variant="outline" size="sm">
                          View Certificate
                        </Button>
                      </div>
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

export default AgentCRM;