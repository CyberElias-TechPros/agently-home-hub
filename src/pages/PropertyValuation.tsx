import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, TrendingUp, BarChart3, Building2, DollarSign, Calendar, Users, Eye, FileText, AlertTriangle, CheckCircle, Clock, Search, Plus, Edit, Target } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { PropertyValuation, PropertyInspection, ValuationReport, ValuationDispute, Property } from '@/types';

const PropertyValuation = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('valuation');
  
  // State for property valuation
  const [valuations, setValuations] = useState<PropertyValuation[]>([]);
  const [inspections, setInspections] = useState<PropertyInspection[]>([]);
  const [reports, setReports] = useState<ValuationReport[]>([]);
  const [disputes, setDisputes] = useState<ValuationDispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchProperty, setSearchProperty] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  
  // Form state for new valuation
  const [valuationForm, setValuationForm] = useState({
    propertyId: '',
    avmValue: 0,
    confidenceScore: 0,
    methodology: 'avm',
    factors: [],
    comparables: [],
    marketTrends: []
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      loadValuationData();
    }
  }, [isAuthenticated, user]);

  const loadValuationData = async () => {
    try {
      setLoading(true);
      const [valuationsData, inspectionsData, reportsData, disputesData] = await Promise.all([
        apiService.getPropertyValuations(),
        apiService.getPropertyInspections(),
        apiService.getValuationReports(),
        apiService.getValuationDisputes()
      ]);
      
      setValuations(valuationsData);
      setInspections(inspectionsData);
      setReports(reportsData);
      setDisputes(disputesData);
    } catch (error) {
      toast({
        title: "Error loading valuation data",
        description: "Failed to load property valuation information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const requestValuation = async () => {
    try {
      setLoading(true);
      const valuation = await apiService.requestPropertyValuation({
        ...valuationForm,
        valuationDate: new Date().toISOString(),
        methodology: 'avm'
      });
      
      setValuations([...valuations, valuation]);
      toast({
        title: "Valuation Requested",
        description: "Your property valuation is being processed.",
      });
    } catch (error) {
      toast({
        title: "Valuation Request Failed",
        description: "Please check your property information and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const requestInspection = async (propertyId: string) => {
    try {
      setLoading(true);
      const inspection = await apiService.requestPropertyInspection({
        propertyId,
        inspectorId: 'inspector1', // Default inspector
        inspectionDate: new Date().toISOString(),
        status: 'scheduled',
        checklist: [],
        notes: '',
        estimatedValue: 0
      });
      
      setInspections([...inspections, inspection]);
      toast({
        title: "Inspection Scheduled",
        description: "A professional inspection has been scheduled for your property.",
      });
    } catch (error) {
      toast({
        title: "Inspection Request Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disputeValuation = async (valuationId: string, reason: string) => {
    try {
      setLoading(true);
      const dispute = await apiService.disputePropertyValuation({
        valuationId,
        clientId: user.id,
        reason,
        requestedValue: 0,
        status: 'under_review',
        evidence: [],
        resolution: ''
      });
      
      setDisputes([...disputes, dispute]);
      toast({
        title: "Dispute Filed",
        description: "Your valuation dispute has been submitted for review.",
      });
    } catch (error) {
      toast({
        title: "Dispute Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getValuationById = (valuationId: string) => {
    return valuations.find(v => v.id === valuationId);
  };

  const getInspectionsByProperty = (propertyId: string) => {
    return inspections.filter(i => i.propertyId === propertyId);
  };

  const getReportsByValuation = (valuationId: string) => {
    return reports.filter(r => r.valuationId === valuationId);
  };

  const getDisputeByValuation = (valuationId: string) => {
    return disputes.find(d => d.valuationId === valuationId);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 75) return 'bg-blue-100 text-blue-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      case 'stable': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Property Valuation</h1>
        <p className="text-muted-foreground">AI-powered property valuation with professional inspection services</p>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="py-8 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to access property valuation services.</p>
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="valuation">Property Valuation</TabsTrigger>
            <TabsTrigger value="inspections">Inspections</TabsTrigger>
            <TabsTrigger value="reports">Valuation Reports</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="comparables">Comparables</TabsTrigger>
          </TabsList>

          <TabsContent value="valuation" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Request Property Valuation
                  </CardTitle>
                  <CardDescription>Get an AI-powered valuation for your property</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); requestValuation(); }} className="space-y-4">
                    <div>
                      <Label htmlFor="property-select">Property</Label>
                      <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                        <SelectTrigger id="property-select">
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">123 Main St, San Francisco</SelectItem>
                          <SelectItem value="2">456 Tower Plaza, New York</SelectItem>
                          <SelectItem value="3">789 College Ave, Boston</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="avm-value">Estimated Value</Label>
                        <Input
                          id="avm-value"
                          type="number"
                          value={valuationForm.avmValue}
                          onChange={(e) => setValuationForm({...valuationForm, avmValue: parseInt(e.target.value)})}
                          placeholder="500000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confidence-score">Confidence Score</Label>
                        <Input
                          id="confidence-score"
                          type="number"
                          step="0.1"
                          value={valuationForm.confidenceScore}
                          onChange={(e) => setValuationForm({...valuationForm, confidenceScore: parseFloat(e.target.value)})}
                          placeholder="85"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Factors</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" />
                          <span className="text-sm">Location</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" />
                          <span className="text-sm">Condition</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" />
                          <span className="text-sm">Market Trends</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" />
                          <span className="text-sm">Size</span>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Request Valuation
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Valuations</CardTitle>
                  <CardDescription>Your property valuations and estimates</CardDescription>
                </CardHeader>
                <CardContent>
                  {valuations.length > 0 ? (
                    <div className="space-y-4">
                      {valuations.map((valuation) => {
                        const reports = getReportsByValuation(valuation.id);
                        const dispute = getDisputeByValuation(valuation.id);
                        
                        return (
                          <Card key={valuation.id} className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold">Property {valuation.propertyId}</h4>
                                <p className="text-sm text-muted-foreground">AVM Value: {formatCurrency(valuation.avmValue)}</p>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm px-2 py-1 rounded ${getConfidenceColor(valuation.confidenceScore)}`}>
                                  Confidence: {valuation.confidenceScore}%
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {new Date(valuation.valuationDate).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Methodology:</span>
                                <span className="ml-2 font-medium">{valuation.methodology}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Comparables:</span>
                                <span className="ml-2 font-medium">{valuation.comparables.length}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Reports:</span>
                                <span className="ml-2 font-medium">{reports.length}</span>
                              </div>
                            </div>

                            {dispute && (
                              <div className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded mb-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm text-yellow-700">Dispute filed</span>
                              </div>
                            )}

                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => setActiveTab('reports')}>
                                <FileText className="h-4 w-4 mr-2" />
                                View Reports
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => requestInspection(valuation.propertyId)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Request Inspection
                              </Button>
                              {!dispute && (
                                <Button variant="outline" size="sm" onClick={() => disputeValuation(valuation.id, "Value seems inaccurate")}>
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Dispute
                                </Button>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Valuations</h3>
                      <p className="text-muted-foreground mb-4">Request a property valuation to get started.</p>
                      <Button onClick={() => setActiveTab('valuation')}>Request Valuation</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inspections" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Property Inspections</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Inspection
                </Button>
              </div>

              {inspections.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {inspections.map((inspection) => (
                    <Card key={inspection.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Eye className="h-5 w-5 mr-2" />
                          Inspection Report
                        </CardTitle>
                        <CardDescription>Property: {inspection.propertyId}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-sm text-muted-foreground">Inspector:</span>
                              <div className="font-semibold">{inspection.inspectorId}</div>
                            </div>
                            <Badge variant={
                              inspection.status === 'completed' ? 'default' :
                              inspection.status === 'scheduled' ? 'secondary' :
                              inspection.status === 'in_progress' ? 'outline' : 'destructive'
                            }>
                              {inspection.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Scheduled:</span>
                              <div className="font-medium">{new Date(inspection.inspectionDate).toLocaleDateString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Completed:</span>
                              <div className="font-medium">{inspection.completedDate ? new Date(inspection.completedDate).toLocaleDateString() : 'N/A'}</div>
                            </div>
                          </div>

                          {inspection.checklist.length > 0 && (
                            <div>
                              <span className="text-sm text-muted-foreground">Inspection Items</span>
                              <div className="space-y-1 mt-2">
                                {inspection.checklist.slice(0, 3).map((item, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                                    <span>{item.item}</span>
                                    <Badge variant="outline" className={`text-xs ${item.condition === 'excellent' ? 'bg-green-100 text-green-800' : item.condition === 'good' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                      {item.condition}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {inspection.estimatedValue > 0 && (
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-700">
                                {formatCurrency(inspection.estimatedValue)}
                              </div>
                              <div className="text-sm text-green-700">Inspection Value</div>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            {inspection.status === 'scheduled' && (
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Reschedule
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Inspections</h3>
                    <p className="text-muted-foreground mb-4">Schedule a professional inspection to assess your property.</p>
                    <Button onClick={() => setActiveTab('valuation')}>Request Valuation</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Valuation Reports</h3>
              
              {reports.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {reports.map((report) => {
                    const valuation = getValuationById(report.valuationId);
                    
                    return (
                      <Card key={report.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <FileText className="h-5 w-5 mr-2" />
                            {report.reportType} Report
                          </CardTitle>
                          <CardDescription>Generated: {new Date(report.generatedAt).toLocaleDateString()}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="text-center p-6 bg-blue-50 rounded-lg">
                              <div className="text-3xl font-bold text-blue-700">
                                {formatCurrency(valuation?.avmValue || 0)}
                              </div>
                              <div className="text-sm text-blue-700">Estimated Value</div>
                            </div>

                            <div>
                              <span className="text-sm text-muted-foreground">Executive Summary</span>
                              <p className="text-sm mt-2">{report.executiveSummary}</p>
                            </div>

                            {report.sections.length > 0 && (
                              <div>
                                <span className="text-sm text-muted-foreground">Report Sections</span>
                                <div className="space-y-2 mt-2">
                                  {report.sections.map((section, index) => (
                                    <div key={index} className="p-3 bg-muted rounded">
                                      <h4 className="font-medium">{section.title}</h4>
                                      <p className="text-sm text-muted-foreground mt-1">{section.content}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div>
                              <span className="text-sm text-muted-foreground">Conclusion</span>
                              <p className="text-sm mt-2 font-medium">{report.conclusion}</p>
                            </div>

                            {report.disclaimers.length > 0 && (
                              <div>
                                <span className="text-sm text-muted-foreground">Disclaimers</span>
                                <div className="space-y-1 mt-2">
                                  {report.disclaimers.map((disclaimer, index) => (
                                    <div key={index} className="text-xs text-muted-foreground">
                                      • {disclaimer}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                              </Button>
                              <Button variant="outline" size="sm">
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
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
                    <h3 className="text-lg font-semibold mb-2">No Reports</h3>
                    <p className="text-muted-foreground">Valuation reports will appear here after processing.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="disputes" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Valuation Disputes</h3>
              
              {disputes.length > 0 ? (
                <div className="space-y-4">
                  {disputes.map((dispute) => {
                    const valuation = getValuationById(dispute.valuationId);
                    
                    return (
                      <Card key={dispute.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-semibold">Dispute for Property {dispute.valuationId}</h4>
                              <p className="text-sm text-muted-foreground">Original Value: {formatCurrency(valuation?.avmValue || 0)}</p>
                            </div>
                            <Badge variant={
                              dispute.status === 'under_review' ? 'secondary' :
                              dispute.status === 'resolved' ? 'default' : 'destructive'
                            }>
                              {dispute.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Reason:</span>
                              <p className="mt-1">{dispute.reason}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Requested Value:</span>
                              <p className="mt-1 font-medium">{formatCurrency(dispute.requestedValue)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Filed:</span>
                              <p className="mt-1">{new Date(dispute.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Resolution:</span>
                              <p className="mt-1">{dispute.resolution || 'Pending'}</p>
                            </div>
                          </div>

                          {dispute.evidence.length > 0 && (
                            <div className="mb-4">
                              <span className="text-sm text-muted-foreground">Evidence</span>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {dispute.evidence.map((evidence, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">{evidence}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            {dispute.status === 'under_review' && (
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Update
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
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Disputes</h3>
                    <p className="text-muted-foreground">Disputes will appear here if you challenge a valuation.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="comparables" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Comparable Properties</h3>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search comparables..."
                      value={searchProperty}
                      onChange={(e) => setSearchProperty(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Comparable
                  </Button>
                </div>
              </div>

              {valuations.length > 0 ? (
                <div className="space-y-4">
                  {valuations.map((valuation) => (
                    <Card key={valuation.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Target className="h-5 w-5 mr-2" />
                          Comparables for Property {valuation.propertyId}
                        </CardTitle>
                        <CardDescription>Recent sales in similar properties</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {valuation.comparables.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Address</TableHead>
                                <TableHead>Sale Price</TableHead>
                                <TableHead>Sale Date</TableHead>
                                <TableHead>Distance</TableHead>
                                <TableHead>Similarity</TableHead>
                                <TableHead>Adjustments</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {valuation.comparables.map((comp, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{comp.address}</TableCell>
                                  <TableCell>{formatCurrency(comp.salePrice)}</TableCell>
                                  <TableCell>{new Date(comp.saleDate).toLocaleDateString()}</TableCell>
                                  <TableCell>{comp.distance} mi</TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <div className="w-16 bg-gray-200 rounded-full h-2">
                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${comp.similarity}%` }}></div>
                                      </div>
                                      <span className="text-sm">{comp.similarity}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      {comp.adjustments.map((adjustment, idx) => (
                                        <div key={idx} className="text-xs">
                                          <span className="font-medium">{adjustment.type}:</span> {adjustment.reason} (${adjustment.amount})
                                        </div>
                                      ))}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8">
                            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Comparables</h3>
                            <p className="text-muted-foreground">Comparable properties will be analyzed during valuation.</p>
                          </div>
                        )}

                        {valuation.marketTrends.length > 0 && (
                          <div className="mt-6">
                            <h4 className="font-medium mb-3">Market Trends</h4>
                            <div className="grid grid-cols-3 gap-4">
                              {valuation.marketTrends.map((trend, index) => (
                                <div key={index} className="p-4 bg-muted rounded-lg">
                                  <div className="flex items-center space-x-2 mb-2">
                                    {getTrendIcon(trend.trend)}
                                    <span className="font-medium">{trend.period}</span>
                                  </div>
                                  <div className="text-2xl font-bold">{trend.appreciation}%</div>
                                  <div className="text-sm text-muted-foreground">Appreciation</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Inventory: {trend.inventory} • DOM: {trend.daysOnMarket}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Comparables</h3>
                    <p className="text-muted-foreground">Request a property valuation to see comparable analysis.</p>
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

export default PropertyValuation;