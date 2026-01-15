import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Phone, 
  Mail, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  PhoneCall,
  MessageSquare,
  CalendarDays,
  Target,
  Activity,
  DollarSign,
  UserCheck,
  Building2,
  MapPin,
  Star,
  ArrowUp,
  ArrowDown,
  Globe,
  CalendarPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';

interface Commission {
  id: string;
  agent_id: string;
  lead_id: string;
  property_id: string;
  deal_value: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'earned' | 'paid' | 'cancelled';
  closing_date: string;
  payment_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface Showing {
  id: string;
  lead_id: string;
  property_id: string;
  agent_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  property_address: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes: string;
  created_at: string;
  updated_at: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  source_details: string;
  property_id: number;
  property_preferences: any;
  budget_min: number;
  budget_max: number;
  preferred_locations: string[];
  preferred_property_types: string[];
  preferred_bedrooms: number;
  preferred_bathrooms: number;
  preferred_area_min: number;
  preferred_area_max: number;
  move_in_date: string;
  lease_term_months: number;
  status: string;
  priority: string;
  agent_id: number;
  assigned_at: string;
  preferred_contact_method: string;
  best_contact_time: string;
  timezone: string;
  lead_score: number;
  notes: string;
  last_contacted_at: string;
  next_follow_up_at: string;
  follow_up_notes: string;
  conversion_probability: number;
  estimated_close_date: string;
  estimated_commission: number;
  created_at: string;
  updated_at: string;
  property_title?: string;
  property_address?: string;
  agent_name?: string;
  agent_email?: string;
  agent_phone?: string;
}

interface LeadStatistics {
  total_leads: number;
  new_leads: number;
  contacted_leads: number;
  qualified_leads: number;
  closed_won_leads: number;
  closed_lost_leads: number;
  conversion_rate: number;
  avg_lead_score: number;
  leads_this_month: number;
  leads_this_week: number;
}

export default function AgentCRMDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statistics, setStatistics] = useState<LeadStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showScheduleShowing, setShowScheduleShowing] = useState(false);
  const [showings, setShowings] = useState<Showing[]>([]);
  const [showingData, setShowingData] = useState<Partial<Showing> | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [showCommissionDetails, setShowCommissionDetails] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  useEffect(() => {
    fetchLeads();
    fetchStatistics();
    fetchShowings();
    fetchCommissions();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leads', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }

      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch leads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/leads/statistics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleLeadStatusUpdate = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update lead status');
      }

      const updatedLead = await response.json();
      
      // Update lead in local state
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? updatedLead : lead
      ));

      toast({
        title: 'Lead Updated',
        description: `Lead status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update lead status',
        variant: 'destructive',
      });
    }
  };

  const handleLeadAssignment = async (leadId: string, agentId: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/assign`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign lead');
      }

      const updatedLead = await response.json();
      
      // Update lead in local state
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? updatedLead : lead
      ));

      toast({
        title: 'Lead Assigned',
        description: 'Lead has been assigned successfully',
      });
    } catch (error) {
      console.error('Error assigning lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign lead',
        variant: 'destructive',
      });
    }
  };

  const handleAddCommunication = async (leadId: string, communicationData: any) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/communications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(communicationData),
      });

      if (!response.ok) {
        throw new Error('Failed to add communication');
      }

      const newCommunication = await response.json();
      
      toast({
        title: 'Communication Added',
        description: 'Communication record has been added successfully',
      });

      return newCommunication;
    } catch (error) {
      console.error('Error adding communication:', error);
      toast({
        title: 'Error',
        description: 'Failed to add communication',
        variant: 'destructive',
      });
    }
  };

  const handleAddTask = async (leadId: string, taskData: any) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        throw new Error('Failed to add task');
      }

      const newTask = await response.json();
      
      toast({
        title: 'Task Added',
        description: 'Task has been added successfully',
      });

      return newTask;
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: 'Error',
        description: 'Failed to add task',
        variant: 'destructive',
      });
    }
  };

  const handleScheduleShowing = async (showingData: Partial<Showing>) => {
    try {
      const response = await fetch('/api/showings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(showingData),
      });

      if (!response.ok) {
        throw new Error('Failed to schedule showing');
      }

      const newShowing = await response.json();
      
      toast({
        title: 'Showing Scheduled',
        description: 'Property showing has been scheduled successfully',
      });

      setShowScheduleShowing(false);
      return newShowing;
    } catch (error) {
      console.error('Error scheduling showing:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule showing',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateShowingStatus = async (showingId: string, status: Showing['status']) => {
    try {
      const response = await fetch(`/api/showings/${showingId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update showing status');
      }

      const updatedShowing = await response.json();
      
      // Update showing in local state
      setShowings(prev => prev.map(showing => 
        showing.id === showingId ? updatedShowing : showing
      ));

      toast({
        title: 'Showing Updated',
        description: `Showing status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating showing status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update showing status',
        variant: 'destructive',
      });
    }
  };

  const fetchShowings = async () => {
    try {
      const response = await fetch('/api/showings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch showings');
      }

      const data = await response.json();
      setShowings(data.showings || []);
    } catch (error) {
      console.error('Error fetching showings:', error);
    }
  };

  const fetchCommissions = async () => {
    try {
      const response = await fetch('/api/commissions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch commissions');
      }

      const data = await response.json();
      setCommissions(data.commissions || []);
    } catch (error) {
      console.error('Error fetching commissions:', error);
    }
  };

  const handleUpdateCommissionStatus = async (commissionId: string, status: Commission['status']) => {
    try {
      const response = await fetch(`/api/commissions/${commissionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update commission status');
      }

      const updatedCommission = await response.json();
      
      // Update commission in local state
      setCommissions(prev => prev.map(commission => 
        commission.id === commissionId ? updatedCommission : commission
      ));

      toast({
        title: 'Commission Updated',
        description: `Commission status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating commission status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update commission status',
        variant: 'destructive',
      });
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesSource;
  }).sort((a, b) => {
    const aValue = a[sortBy as keyof Lead];
    const bValue = b[sortBy as keyof Lead];
    
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return sortOrder === 'asc' ? 1 : -1;
    if (bValue === null) return sortOrder === 'asc' ? -1 : 1;
    
    const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-gray-100 text-gray-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'interested': return 'bg-purple-100 text-purple-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'viewing_scheduled': return 'bg-orange-100 text-orange-800';
      case 'viewing_completed': return 'bg-indigo-100 text-indigo-800';
      case 'offer_made': return 'bg-pink-100 text-pink-800';
      case 'negotiating': return 'bg-yellow-100 text-yellow-800';
      case 'closed_won': return 'bg-emerald-100 text-emerald-800';
      case 'closed_lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'website': return <Globe className="h-4 w-4" />;
      case 'referral': return <Users className="h-4 w-4" />;
      case 'social_media': return <MessageSquare className="h-4 w-4" />;
      case 'open_house': return <Building2 className="h-4 w-4" />;
      case 'advertisement': return <Target className="h-4 w-4" />;
      case 'cold_call': return <Phone className="h-4 w-4" />;
      case 'walk_in': return <UserCheck className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getCommissionStatusColor = (status: Commission['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'earned': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold">{statistics?.total_leads || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Leads</p>
                <p className="text-2xl font-bold">{statistics?.new_leads || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold">{statistics?.conversion_rate || 0}%</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-full">
                <Target className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Lead Score</p>
                <p className="text-2xl font-bold">{statistics?.avg_lead_score || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="viewing_scheduled">Viewing Scheduled</SelectItem>
                  <SelectItem value="viewing_completed">Viewing Completed</SelectItem>
                  <SelectItem value="offer_made">Offer Made</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="open_house">Open House</SelectItem>
                  <SelectItem value="advertisement">Advertisement</SelectItem>
                  <SelectItem value="cold_call">Cold Call</SelectItem>
                  <SelectItem value="walk_in">Walk In</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => setShowAddLead(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Lead
              </Button>
            </div>

            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="lead_score">Lead Score</SelectItem>
                  <SelectItem value="last_contacted_at">Last Contact</SelectItem>
                  <SelectItem value="next_follow_up_at">Next Follow Up</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading leads...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No leads found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedLead(lead);
                    setShowLeadDetails(true);
                  }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(lead.status)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">
                          {lead.first_name} {lead.last_name}
                        </h4>
                        <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                          {lead.priority}
                        </Badge>
                        <Badge variant="outline" className="bg-gray-100 text-gray-800">
                          {lead.source}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </span>
                        )}
                        {lead.property_title && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {lead.property_title}
                          </span>
                        )}
                        {lead.lead_score > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Score: {lead.lead_score}
                          </span>
                        )}
                      </div>
                      {lead.notes && (
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {lead.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLeadDetails(true);
                        setSelectedLead(lead);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeadStatusUpdate(lead.id, 'qualified');
                      }}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Details Dialog */}
      <Dialog open={showLeadDetails} onOpenChange={setShowLeadDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6">
              {/* Lead Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <p className="font-medium">
                        {selectedLead.first_name} {selectedLead.last_name}
                      </p>
                    </div>
                    {selectedLead.email && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Email</label>
                        <p className="font-medium">{selectedLead.email}</p>
                      </div>
                    )}
                    {selectedLead.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phone</label>
                      <p className="font-medium">{selectedLead.phone}</p>
                    </div>
                    )}
                    {selectedLead.company && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Company</label>
                        <p className="font-medium">{selectedLead.company}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Lead Details</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <Badge className={getStatusColor(selectedLead.status)}>
                        {selectedLead.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Priority</label>
                      <Badge className={getPriorityColor(selectedLead.priority)}>
                        {selectedLead.priority}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Source</label>
                      <div className="flex items-center gap-2">
                        {getSourceIcon(selectedLead.source)}
                        <span className="text-medium">{selectedLead.source}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Lead Score</label>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{selectedLead.lead_score}/100</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Conversion Probability</label>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{selectedLead.conversion_probability}%</span>
                      </div>
                    </div>
                    {selectedLead.estimated_commission && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Estimated Commission</label>
                        <p className="font-medium text-green-600">
                          {formatCurrency(selectedLead.estimated_commission)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Property Preferences */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Property Preferences</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Budget Range</label>
                    <p className="font-medium">
                      {selectedLead.budget_min && formatCurrency(selectedLead.budget_min)}
                      {selectedLead.budget_max && ` - ${formatCurrency(selectedLead.budget_max)}`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Preferred Locations</label>
                    <div className="flex flex-wrap gap-1">
                      {selectedLead.preferred_locations?.map((location, index) => (
                        <Badge key={index} variant="secondary">
                          {location}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Property Types</label>
                    <div className="flex flex-wrap gap-1">
                      {selectedLead.preferred_property_types?.map((type, index) => (
                        <Badge key={index} variant="outline">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Bedrooms/Bathrooms</label>
                    <p className="font-medium">
                      {selectedLead.preferred_bedrooms || 'Any'} / {selectedLead.preferred_bathrooms || 'Any'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-600">Area Range</label>
                    <p className="font-medium">
                      {selectedLead.preferred_area_min || 'Any'} - {selectedLead.preferred_area_max || 'Any'} sq ft
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Move-in Date</label>
                    <p className="font-medium">
                      {selectedLead.move_in_date ? formatDate(selectedLead.move_in_date) : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Preferences */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Preferences</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Preferred Contact Method</label>
                    <p className="font-medium capitalize">{selectedLead.preferred_contact_method}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Best Contact Time</label>
                    <p className="font-medium">{selectedLead.best_contact_time || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Notes and Timeline */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Notes & Timeline</h3>
                <div className="space-y-4">
                  {selectedLead.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Notes</label>
                      <p className="font-medium whitespace-pre-wrap">{selectedLead.notes}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Follow-up Notes</label>
                    <p className="font-medium whitespace-pre-wrap">
                      {selectedLead.follow_up_notes || 'No follow-up notes'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Contact</label>
                    <p className="font-medium">
                      {selectedLead.last_contacted_at 
                        ? formatDate(selectedLead.last_contacted_at)
                        : 'No contact yet'
                      }
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Next Follow-up</label>
                    <p className="font-medium">
                      {selectedLead.next_follow_up_at 
                        ? formatDate(selectedLead.next_follow_up_at)
                        : 'No follow-up scheduled'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowLeadDetails(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleLeadStatusUpdate(selectedLead.id, 'contacted')}
                >
                  Mark as Contacted
                </Button>
                <Button
                  onClick={() => handleLeadStatusUpdate(selectedLead.id, 'qualified')}
                >
                  Mark as Qualified
                </Button>
                <Button
                  onClick={() => {
                    setShowScheduleShowing(true);
                    setShowLeadDetails(false);
                  }}
                >
                  Schedule Viewing
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Showing Scheduling Dialog */}
      <Dialog open={showScheduleShowing} onOpenChange={setShowScheduleShowing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Property Showing</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {selectedLead && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Client Name</label>
                    <p className="font-medium">{selectedLead.first_name} {selectedLead.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Contact Info</label>
                    <p className="font-medium">
                      {selectedLead.email && <div>{selectedLead.email}</div>}
                      {selectedLead.phone && <div>{selectedLead.phone}</div>}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Property</label>
                    <p className="font-medium">
                      {selectedLead.property_title || 'Property to be determined'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="font-medium">
                      {selectedLead.property_address || 'Address to be determined'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date</label>
                    <Input
                      type="date"
                      onChange={(e) => {
                        const newShowingData = {
                          lead_id: selectedLead.id,
                          property_id: selectedLead.property_id?.toString() || '',
                          agent_id: '1', // This should come from auth context
                          client_name: `${selectedLead.first_name} ${selectedLead.last_name}`,
                          client_email: selectedLead.email || '',
                          client_phone: selectedLead.phone || '',
                          property_address: selectedLead.property_address || '',
                          scheduled_date: e.target.value,
                          scheduled_time: '14:00',
                          duration: 60,
                          status: 'scheduled' as const,
                          notes: '',
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString()
                        };
                        setShowingData(newShowingData);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Time</label>
                    <Input
                      type="time"
                      defaultValue="14:00"
                      onChange={(e) => {
                        const newShowingData = {
                          lead_id: selectedLead.id,
                          property_id: selectedLead.property_id?.toString() || '',
                          agent_id: '1',
                          client_name: `${selectedLead.first_name} ${selectedLead.last_name}`,
                          client_email: selectedLead.email || '',
                          client_phone: selectedLead.phone || '',
                          property_address: selectedLead.property_address || '',
                          scheduled_date: showingData?.scheduled_date || '',
                          scheduled_time: e.target.value,
                          duration: 60,
                          status: 'scheduled' as const,
                          notes: '',
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString()
                        };
                        setShowingData(newShowingData);
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Duration (minutes)</label>
                  <Input
                    type="number"
                    defaultValue="60"
                    min="30"
                    max="180"
                    onChange={(e) => {
                      const showingData = {
                        lead_id: selectedLead.id,
                        property_id: selectedLead.property_id?.toString() || '',
                        agent_id: '1',
                        client_name: `${selectedLead.first_name} ${selectedLead.last_name}`,
                        client_email: selectedLead.email || '',
                        client_phone: selectedLead.phone || '',
                        property_address: selectedLead.property_address || '',
                        scheduled_date: showingData?.scheduled_date || '',
                        scheduled_time: showingData?.scheduled_time || '14:00',
                        duration: parseInt(e.target.value),
                        status: 'scheduled' as const,
                        notes: '',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      };
                      setShowingData(showingData);
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Notes</label>
                  <Textarea
                    placeholder="Add any special notes about this showing..."
                    onChange={(e) => {
                      const newShowingData = {
                        lead_id: selectedLead.id,
                        property_id: selectedLead.property_id?.toString() || '',
                        agent_id: '1',
                        client_name: `${selectedLead.first_name} ${selectedLead.last_name}`,
                        client_email: selectedLead.email || '',
                        client_phone: selectedLead.phone || '',
                        property_address: selectedLead.property_address || '',
                        scheduled_date: showingData?.scheduled_date || '',
                        scheduled_time: showingData?.scheduled_time || '14:00',
                        duration: showingData?.duration || 60,
                        status: 'scheduled' as const,
                        notes: e.target.value,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      };
                      setShowingData(newShowingData);
                    }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowScheduleShowing(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (showingData && selectedLead) {
                  handleScheduleShowing(showingData);
                }
              }}
              disabled={!showingData?.scheduled_date}
            >
              Schedule Showing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
