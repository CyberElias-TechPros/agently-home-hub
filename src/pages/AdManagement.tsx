import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, BarChart3, DollarSign, Calendar, Users, Eye, TrendingUp, AlertTriangle, CheckCircle, Clock, Plus, Edit, Trash2, Globe, Target, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';

const AdManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('campaigns');
  
  // State for ad management
  const [campaigns, setCampaigns] = useState([]);
  const [ads, setAds] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [targeting, setTargeting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    if (isAuthenticated && user) {
      loadAdData();
    }
  }, [isAuthenticated, user]);

  const loadAdData = async () => {
    try {
      setLoading(true);
      // Mock data for now - would come from API
      const mockCampaigns = [
        {
          id: '1',
          name: 'Premium Listings Campaign',
          status: 'active',
          budget: 5000,
          spent: 2500,
          clicks: 1200,
          impressions: 50000,
          ctr: 2.4,
          cpm: 50,
          startDate: '2024-11-01',
          endDate: '2024-12-31'
        },
        {
          id: '2',
          name: 'Agent Recruitment',
          status: 'paused',
          budget: 3000,
          spent: 1800,
          clicks: 800,
          impressions: 30000,
          ctr: 2.7,
          cpm: 60,
          startDate: '2024-10-15',
          endDate: '2024-12-15'
        }
      ];

      const mockAds = [
        {
          id: '1',
          campaignId: '1',
          title: 'Find Your Dream Home',
          description: 'Browse thousands of listings with advanced filters',
          imageUrl: '/api/placeholder/300/250',
          cta: 'Explore Now',
          status: 'active',
          clicks: 600,
          impressions: 25000,
          ctr: 2.4
        }
      ];

      setCampaigns(mockCampaigns);
      setAds(mockAds);
    } catch (error) {
      toast({
        title: "Error loading ad data",
        description: "Failed to load advertising information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (campaignData) => {
    try {
      setLoading(true);
      // Mock API call
      const newCampaign = {
        id: Date.now().toString(),
        ...campaignData,
        status: 'active',
        spent: 0,
        clicks: 0,
        impressions: 0,
        ctr: 0
      };
      
      setCampaigns([...campaigns, newCampaign]);
      toast({
        title: "Campaign Created",
        description: "Your advertising campaign has been created successfully!",
      });
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCampaignStatus = async (campaignId, status) => {
    try {
      setLoading(true);
      setCampaigns(campaigns.map(c => 
        c.id === campaignId ? {...c, status} : c
      ));
      toast({
        title: "Campaign Updated",
        description: `Campaign has been ${status}.`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update campaign status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (campaignId) => {
    try {
      setLoading(true);
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
      setAds(ads.filter(a => a.campaignId !== campaignId));
      toast({
        title: "Campaign Deleted",
        description: "Campaign and associated ads have been removed.",
      });
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getBudgetColor = (spent, budget) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 90) return 'bg-red-100 text-red-800';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ad Management</h1>
        <p className="text-muted-foreground">Manage advertising campaigns and track performance</p>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to access ad management.</p>
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="ads">Ads</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="targeting">Targeting</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search campaigns..."
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
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{campaign.name}</span>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-bold text-blue-700">${campaign.budget}</div>
                            <div className="text-xs text-blue-700">Budget</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-700">${campaign.spent}</div>
                            <div className="text-xs text-green-700">Spent</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Budget Usage</span>
                            <span className={`text-sm px-2 py-1 rounded ${getBudgetColor(campaign.spent, campaign.budget)}`}>
                              {((campaign.spent / campaign.budget) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Clicks</span>
                            <div className="font-medium">{campaign.clicks.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Impressions</span>
                            <div className="font-medium">{campaign.impressions.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CTR</span>
                            <div className="font-medium">{campaign.ctr}%</div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setActiveTab('ads')}>
                            <Eye className="h-4 w-4 mr-1" />
                            View Ads
                          </Button>
                          {campaign.status === 'active' ? (
                            <Button variant="outline" size="sm" onClick={() => updateCampaignStatus(campaign.id, 'paused')}>
                              Pause
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => updateCampaignStatus(campaign.id, 'active')}>
                              Resume
                            </Button>
                          )}
                          <Button variant="destructive" size="sm" onClick={() => deleteCampaign(campaign.id)}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ads" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Ad Creatives</h3>
              
              {ads.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {ads.map((ad) => {
                    const campaign = campaigns.find(c => c.id === ad.campaignId);
                    
                    return (
                      <Card key={ad.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>{ad.title}</span>
                            <Badge className={getStatusColor(ad.status)}>
                              {ad.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription>Campaign: {campaign?.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                              <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                            </div>
                            
                            <p className="text-sm text-muted-foreground">{ad.description}</p>
                            
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Clicks</span>
                                <div className="font-medium">{ad.clicks}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Impressions</span>
                                <div className="font-medium">{ad.impressions}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">CTR</span>
                                <div className="font-medium">{ad.ctr}%</div>
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Ads</h3>
                    <p className="text-muted-foreground">Create ads within your campaigns to get started.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Campaign Analytics</h3>
              
              {campaigns.length > 0 ? (
                <div className="grid gap-6">
                  {/* Performance Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Performance Overview
                      </CardTitle>
                      <CardDescription>Overall campaign performance metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-6 bg-blue-50 rounded-lg">
                          <div className="text-3xl font-bold text-blue-700">
                            {campaigns.reduce((sum, c) => sum + c.clicks, 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-blue-700">Total Clicks</div>
                        </div>
                        <div className="text-center p-6 bg-green-50 rounded-lg">
                          <div className="text-3xl font-bold text-green-700">
                            {campaigns.reduce((sum, c) => sum + c.impressions, 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-green-700">Total Impressions</div>
                        </div>
                        <div className="text-center p-6 bg-purple-50 rounded-lg">
                          <div className="text-3xl font-bold text-purple-700">
                            ${campaigns.reduce((sum, c) => sum + c.spent, 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-purple-700">Total Spent</div>
                        </div>
                        <div className="text-center p-6 bg-orange-50 rounded-lg">
                          <div className="text-3xl font-bold text-orange-700">
                            {(campaigns.reduce((sum, c) => sum + c.ctr, 0) / campaigns.length).toFixed(2)}%
                          </div>
                          <div className="text-sm text-orange-700">Average CTR</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Campaign Performance Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Performance</CardTitle>
                      <CardDescription>Campaign-by-campaign analytics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Campaign</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Budget</TableHead>
                            <TableHead>Spent</TableHead>
                            <TableHead>Clicks</TableHead>
                            <TableHead>Impressions</TableHead>
                            <TableHead>CTR</TableHead>
                            <TableHead>CPM</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {campaigns.map((campaign) => (
                            <TableRow key={campaign.id}>
                              <TableCell className="font-medium">{campaign.name}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(campaign.status)}>
                                  {campaign.status}
                                </Badge>
                              </TableCell>
                              <TableCell>${campaign.budget.toLocaleString()}</TableCell>
                              <TableCell>${campaign.spent.toLocaleString()}</TableCell>
                              <TableCell>{campaign.clicks.toLocaleString()}</TableCell>
                              <TableCell>{campaign.impressions.toLocaleString()}</TableCell>
                              <TableCell>{campaign.ctr}%</TableCell>
                              <TableCell>${campaign.cpm}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Ad Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Ad Performance</CardTitle>
                      <CardDescription>Individual ad creative performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ad Title</TableHead>
                            <TableHead>Campaign</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Clicks</TableHead>
                            <TableHead>Impressions</TableHead>
                            <TableHead>CTR</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ads.map((ad) => (
                            <TableRow key={ad.id}>
                              <TableCell className="font-medium">{ad.title}</TableCell>
                              <TableCell>{campaigns.find(c => c.id === ad.campaignId)?.name}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(ad.status)}>
                                  {ad.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{ad.clicks}</TableCell>
                              <TableCell>{ad.impressions}</TableCell>
                              <TableCell>{ad.ctr}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
                    <p className="text-muted-foreground">Create campaigns to see performance analytics.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="targeting" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Audience Targeting</h3>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Geographic Targeting */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      Geographic Targeting
                    </CardTitle>
                    <CardDescription>Target by location</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Target Countries</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select countries" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us">United States</SelectItem>
                            <SelectItem value="ca">Canada</SelectItem>
                            <SelectItem value="uk">United Kingdom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Target Cities</Label>
                        <Input placeholder="Enter cities, comma-separated" />
                      </div>
                      <div>
                        <Label>Radius Targeting</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="number" placeholder="Radius (miles)" />
                          <Input placeholder="Center location" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Demographic Targeting */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Demographic Targeting
                    </CardTitle>
                    <CardDescription>Target by demographics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Age Range</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="number" placeholder="Min age" />
                          <Input type="number" placeholder="Max age" />
                        </div>
                      </div>
                      <div>
                        <Label>Income Range</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="number" placeholder="Min income" />
                          <Input type="number" placeholder="Max income" />
                        </div>
                      </div>
                      <div>
                        <Label>Homeownership Status</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" id="owner" />
                            <label htmlFor="owner">Homeowners</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" id="renter" />
                            <label htmlFor="renter">Renters</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Interest Targeting */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Interest Targeting
                    </CardTitle>
                    <CardDescription>Target by interests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Real Estate Interests</Label>
                        <div className="space-y-2">
                          {['Buying', 'Selling', 'Renting', 'Investing', 'Home Improvement'].map((interest) => (
                            <div key={interest} className="flex items-center space-x-2">
                              <input type="checkbox" id={`interest-${interest}`} />
                              <label htmlFor={`interest-${interest}`}>{interest}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Life Events</Label>
                        <div className="space-y-2">
                          {['Recently Moved', 'Job Change', 'Marriage', 'Family Growth'].map((event) => (
                            <div key={event} className="flex items-center space-x-2">
                              <input type="checkbox" id={`event-${event}`} />
                              <label htmlFor={`event-${event}`}>{event}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Budget Allocation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Budget Allocation
                    </CardTitle>
                    <CardDescription>Allocate budget by targeting</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Geographic Budget Split</Label>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Primary Market</span>
                            <span>60%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full w-3/5"></div>
                          </div>
                        </div>
                        <div className="space-y-2 mt-4">
                          <div className="flex justify-between text-sm">
                            <span>Secondary Market</span>
                            <span>30%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full w-3/10"></div>
                          </div>
                        </div>
                        <div className="space-y-2 mt-4">
                          <div className="flex justify-between text-sm">
                            <span>Experimental</span>
                            <span>10%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-purple-600 h-2 rounded-full w-1/10"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Eye className="h-5 w-5 mr-2" />
                      Performance Insights
                    </CardTitle>
                    <CardDescription>Targeting performance data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">78%</div>
                        <div className="text-sm text-green-700">Best Performing Segment</div>
                        <div className="text-xs text-muted-foreground mt-1">Urban homeowners, 30-45</div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Urban Areas</span>
                          <span className="font-medium">CTR: 3.2%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Suburban Areas</span>
                          <span className="font-medium">CTR: 2.1%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Rural Areas</span>
                          <span className="font-medium">CTR: 1.4%</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Optimize
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* A/B Testing */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      A/B Testing
                    </CardTitle>
                    <CardDescription>Test different targeting strategies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Test Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select test type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="geographic">Geographic</SelectItem>
                            <SelectItem value="demographic">Demographic</SelectItem>
                            <SelectItem value="interest">Interest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Variation A</Label>
                          <Input placeholder="Description" />
                        </div>
                        <div>
                          <Label>Variation B</Label>
                          <Input placeholder="Description" />
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Start Test
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Results
                        </Button>
                      </div>
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

export default AdManagement;