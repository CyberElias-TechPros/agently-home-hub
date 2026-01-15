import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, DollarSign, FileText, Calendar, TrendingUp, Users, Home, AlertTriangle, CheckCircle, Clock, Search, Plus, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { InsuranceProvider, InsuranceQuote, InsurancePolicy, InsuranceClaim, InsuranceRecommendation } from '@/types';

const Insurance = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('quotes');
  
  // State for insurance management
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [quotes, setQuotes] = useState<InsuranceQuote[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [recommendations, setRecommendations] = useState<InsuranceRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state for new quotes
  const [quoteForm, setQuoteForm] = useState({
    propertyId: '',
    coverageType: 'Property',
    coverageAmount: 500000,
    deductible: 1000,
    term: 12
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      loadInsuranceData();
    }
  }, [isAuthenticated, user]);

  const loadInsuranceData = async () => {
    try {
      setLoading(true);
      const [providersData, policiesData, claimsData, recommendationsData] = await Promise.all([
        apiService.getInsuranceProviders(),
        apiService.getInsurancePolicies(user.id),
        apiService.getInsuranceClaims(user.id),
        apiService.getInsuranceRecommendations(user.id)
      ]);
      
      setProviders(providersData);
      setPolicies(policiesData);
      setClaims(claimsData);
      setRecommendations(recommendationsData);
    } catch (error) {
      toast({
        title: "Error loading insurance data",
        description: "Failed to load insurance information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getQuote = async () => {
    try {
      setLoading(true);
      const quote = await apiService.getInsuranceQuote({
        ...quoteForm,
        clientId: user.id
      });
      setQuotes([...quotes, quote]);
      toast({
        title: "Quote Generated",
        description: `Quote from ${quote.providerId} for $${quote.premium.toFixed(2)}/year`,
      });
    } catch (error) {
      toast({
        title: "Quote Generation Failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const purchasePolicy = async (quoteId: string) => {
    try {
      setLoading(true);
      const policy = await apiService.purchaseInsurancePolicy(quoteId);
      setPolicies([...policies, policy]);
      setQuotes(quotes.filter(q => q.id !== quoteId));
      toast({
        title: "Policy Purchased",
        description: "Your insurance policy has been activated successfully!",
      });
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: "Please check your payment information and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fileClaim = async (claimData: Partial<InsuranceClaim>) => {
    try {
      setLoading(true);
      const claim = await apiService.fileInsuranceClaim({
        ...claimData,
        clientId: user.id
      } as InsuranceClaim);
      setClaims([...claims, claim]);
      toast({
        title: "Claim Filed",
        description: "Your claim has been submitted for review.",
      });
    } catch (error) {
      toast({
        title: "Claim Filing Failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelPolicy = async (policyId: string) => {
    try {
      setLoading(true);
      await apiService.cancelInsurancePolicy(policyId);
      setPolicies(policies.filter(p => p.id !== policyId));
      toast({
        title: "Policy Cancelled",
        description: "Your insurance policy has been cancelled.",
      });
    } catch (error) {
      toast({
        title: "Cancellation Failed",
        description: "Please contact support to cancel your policy.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProviderById = (providerId: string) => {
    return providers.find(p => p.id === providerId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Insurance Management</h1>
        <p className="text-muted-foreground">Protect your property with comprehensive insurance coverage</p>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to access insurance services.</p>
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="quotes">Get Quotes</TabsTrigger>
            <TabsTrigger value="policies">My Policies</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="quotes" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Get Insurance Quote
                  </CardTitle>
                  <CardDescription>Compare quotes from top insurance providers</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); getQuote(); }} className="space-y-4">
                    <div>
                      <Label htmlFor="property-select">Property</Label>
                      <Select
                        value={quoteForm.propertyId}
                        onValueChange={(value) => setQuoteForm({...quoteForm, propertyId: value})}
                      >
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

                    <div>
                      <Label htmlFor="coverage-type">Coverage Type</Label>
                      <Select
                        value={quoteForm.coverageType}
                        onValueChange={(value) => setQuoteForm({...quoteForm, coverageType: value})}
                      >
                        <SelectTrigger id="coverage-type">
                          <SelectValue placeholder="Property" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Property">Property Insurance</SelectItem>
                          <SelectItem value="Liability">Liability Insurance</SelectItem>
                          <SelectItem value="Flood">Flood Insurance</SelectItem>
                          <SelectItem value="Earthquake">Earthquake Insurance</SelectItem>
                          <SelectItem value="Rental Income">Rental Income Insurance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="coverage-amount">Coverage Amount</Label>
                        <Input
                          id="coverage-amount"
                          type="number"
                          value={quoteForm.coverageAmount}
                          onChange={(e) => setQuoteForm({...quoteForm, coverageAmount: parseInt(e.target.value)})}
                          placeholder="500000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="deductible">Deductible</Label>
                        <Input
                          id="deductible"
                          type="number"
                          value={quoteForm.deductible}
                          onChange={(e) => setQuoteForm({...quoteForm, deductible: parseInt(e.target.value)})}
                          placeholder="1000"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="term">Term (months)</Label>
                      <Select
                        value={quoteForm.term.toString()}
                        onValueChange={(value) => setQuoteForm({...quoteForm, term: parseInt(value)})}
                      >
                        <SelectTrigger id="term">
                          <SelectValue placeholder="12" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6 months</SelectItem>
                          <SelectItem value="12">12 months</SelectItem>
                          <SelectItem value="24">24 months</SelectItem>
                          <SelectItem value="36">36 months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Getting Quotes...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Get Quotes
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available Quotes</CardTitle>
                  <CardDescription>Compare quotes from different providers</CardDescription>
                </CardHeader>
                <CardContent>
                  {quotes.length > 0 ? (
                    <div className="space-y-4">
                      {quotes.map((quote) => {
                        const provider = getProviderById(quote.providerId);
                        return (
                          <Card key={quote.id} className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold">{provider?.name}</h4>
                                <p className="text-sm text-muted-foreground">{provider?.description}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-primary">${quote.premium.toFixed(2)}/year</div>
                                <div className="text-sm text-muted-foreground">Deductible: ${quote.deductible}</div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Coverage:</span>
                                <span className="ml-2 font-medium">${quote.coverageAmount.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Term:</span>
                                <span className="ml-2 font-medium">{quote.term} months</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Type:</span>
                                <span className="ml-2 font-medium">{quote.coverageType}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Valid until:</span>
                                <span className="ml-2 font-medium">{new Date(quote.validUntil).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Button size="sm" onClick={() => purchasePolicy(quote.id)}>
                                <Shield className="h-4 w-4 mr-2" />
                                Purchase
                              </Button>
                              <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4 mr-2" />
                                Details
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Quotes Yet</h3>
                      <p className="text-muted-foreground">Fill out the form to get insurance quotes.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="policies" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">My Insurance Policies</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Policy
                </Button>
              </div>

              {policies.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {policies.map((policy) => {
                    const provider = getProviderById(policy.providerId);
                    const daysUntilExpiry = Math.ceil((new Date(policy.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                    const isExpired = daysUntilExpiry <= 0;

                    return (
                      <Card key={policy.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-semibold text-lg">{provider?.name}</h4>
                              <p className="text-sm text-muted-foreground">{policy.policyNumber}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">${policy.premium.toFixed(2)}/year</div>
                              <div className="text-xs text-muted-foreground">Coverage: ${policy.coverageAmount.toLocaleString()}</div>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Type</span>
                              <span>{policy.coverageType}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Start Date</span>
                              <span>{new Date(policy.startDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">End Date</span>
                              <span>{new Date(policy.endDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Status</span>
                              <Badge variant={policy.status === 'active' ? 'default' : 'secondary'}>
                                {policy.status}
                              </Badge>
                            </div>
                          </div>

                          {isExpiringSoon && (
                            <div className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded mb-4">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm text-yellow-700">Expires in {daysUntilExpiry} days</span>
                            </div>
                          )}

                          {isExpired && (
                            <div className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded mb-4">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <span className="text-sm text-red-700">Expired</span>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-2" />
                              Documents
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-2" />
                              Manage
                            </Button>
                            {policy.status === 'active' && (
                              <Button variant="destructive" size="sm" onClick={() => cancelPolicy(policy.id)}>
                                Cancel
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
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Policies</h3>
                    <p className="text-muted-foreground mb-4">Get a quote and purchase your first insurance policy.</p>
                    <Button onClick={() => setActiveTab('quotes')}>Get Quotes</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="claims" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    File a Claim
                  </CardTitle>
                  <CardDescription>Report damage or file a claim quickly</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); fileClaim({} as InsuranceClaim); }} className="space-y-4">
                    <div>
                      <Label>Policy</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select policy" />
                        </SelectTrigger>
                        <SelectContent>
                          {policies.map((policy) => (
                            <SelectItem key={policy.id} value={policy.id}>
                              {getProviderById(policy.providerId)?.name} - {policy.policyNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Claim Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Water Damage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="water">Water Damage</SelectItem>
                          <SelectItem value="fire">Fire Damage</SelectItem>
                          <SelectItem value="theft">Theft</SelectItem>
                          <SelectItem value="storm">Storm Damage</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Incident Date</Label>
                      <Input type="date" />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input placeholder="Describe the incident..." />
                    </div>

                    <div>
                      <Label>Estimated Amount</Label>
                      <Input type="number" placeholder="15000" />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Filing Claim...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          File Claim
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>My Claims</CardTitle>
                  <CardDescription>Track the status of your claims</CardDescription>
                </CardHeader>
                <CardContent>
                  {claims.length > 0 ? (
                    <div className="space-y-4">
                      {claims.map((claim) => (
                        <Card key={claim.id} className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold">{claim.claimType.replace('_', ' ')}</h4>
                              <p className="text-sm text-muted-foreground">Incident: {new Date(claim.incidentDate).toLocaleDateString()}</p>
                            </div>
                            <Badge variant={
                              claim.status === 'approved' ? 'default' :
                              claim.status === 'under_review' ? 'secondary' :
                              claim.status === 'denied' ? 'destructive' : 'outline'
                            }>
                              {claim.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-2">
                            {claim.description}
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span>Claim Amount: ${claim.claimAmount.toLocaleString()}</span>
                            <span>Reported: {new Date(claim.reportedDate).toLocaleDateString()}</span>
                          </div>

                          {claim.notes && (
                            <div className="mt-2 p-2 bg-muted rounded">
                              <span className="text-sm">Notes: {claim.notes}</span>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Claims</h3>
                      <p className="text-muted-foreground">File a claim when you need to report damage.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="providers" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Insurance Providers
                </CardTitle>
                <CardDescription>Trusted insurance companies partnered with Agently</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {providers.map((provider) => (
                    <Card key={provider.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">{provider.name}</h4>
                          <p className="text-sm text-muted-foreground">{provider.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{provider.rating}</div>
                          <div className="text-xs text-muted-foreground">({provider.reviewCount} reviews)</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {provider.coverageTypes.map((type, index) => (
                          <Badge key={index} variant="outline" className="text-xs">{type}</Badge>
                        ))}
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Shield className="h-4 w-4 mr-2" />
                          Get Quote
                        </Button>
                        <Button variant="outline" size="sm">
                          <Users className="h-4 w-4 mr-2" />
                          Visit Website
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Insurance Recommendations
                </CardTitle>
                <CardDescription>Personalized insurance advice for your properties</CardDescription>
              </CardHeader>
              <CardContent>
                {recommendations.length > 0 ? (
                  <div className="space-y-6">
                    {recommendations.map((rec) => (
                      <Card key={rec.id} className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-semibold text-lg">Recommended Coverage</h4>
                            <p className="text-sm text-muted-foreground">Property: {rec.propertyId}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">${rec.recommendedCoverage.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">Deductible: ${rec.recommendedDeductible}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <h5 className="font-medium mb-2">Risk Factors</h5>
                            <div className="space-y-1">
                              {rec.riskFactors.map((factor, index) => (
                                <div key={index} className="flex items-center space-x-2 text-sm">
                                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                                  <span>{factor.factor}: {factor.impact}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="font-medium mb-2">Suggested Providers</h5>
                            <div className="space-y-1">
                              {rec.suggestedProviders.map((providerId, index) => {
                                const provider = getProviderById(providerId);
                                return (
                                  <div key={index} className="flex items-center justify-between text-sm">
                                    <span>{provider?.name}</span>
                                    <Badge variant="outline" className="text-xs">Rate: {provider?.rating}</Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button>
                            <Shield className="h-4 w-4 mr-2" />
                            Get Recommended Quote
                          </Button>
                          <Button variant="outline">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            View Analysis
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Recommendations</h3>
                    <p className="text-muted-foreground">Get a property valuation to receive personalized insurance recommendations.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Insurance;