import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Shield, FileText, AlertTriangle } from 'lucide-react';
import { mockInsuranceProviders, mockInsuranceQuotes, mockInsurancePolicies, mockInsuranceClaims } from '@/lib/mockData';
import { InsuranceProvider, InsuranceQuote, InsurancePolicy, InsuranceClaim } from '@/types';

const Insurance = () => {
  const [activeTab, setActiveTab] = useState('providers');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Insurance Integration</h1>
        <p className="text-muted-foreground">Get quotes, manage policies, and file claims</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockInsuranceProviders.map((provider) => (
              <Card key={provider.id}>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={provider.logo} />
                      <AvatarFallback><Shield className="h-6 w-6" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="ml-1 text-sm">{provider.rating}</span>
                        <span className="ml-1 text-sm text-muted-foreground">({provider.reviewCount})</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{provider.description}</p>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">Coverage Types:</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.coverageTypes.slice(0, 3).map((type, index) => (
                        <Badge key={index} variant="outline" className="text-xs">{type}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button size="sm">Get Quote</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quotes" className="mt-6">
          <div className="space-y-4">
            {mockInsuranceQuotes.map((quote) => {
              const provider = mockInsuranceProviders.find(p => p.id === quote.providerId);
              return (
                <Card key={quote.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{provider?.name} - {quote.coverageType}</CardTitle>
                    <CardDescription>Valid until {new Date(quote.validUntil).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Coverage Amount</p>
                        <p className="font-semibold">${quote.coverageAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly Premium</p>
                        <p className="font-semibold">${quote.premium}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Deductible</p>
                        <p>${quote.deductible}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Term</p>
                        <p>{quote.term} months</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline">Compare</Button>
                      <Button>Purchase</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="policies" className="mt-6">
          <div className="space-y-4">
            {mockInsurancePolicies.map((policy) => {
              const provider = mockInsuranceProviders.find(p => p.id === policy.providerId);
              return (
                <Card key={policy.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{provider?.name}</CardTitle>
                    <CardDescription>Policy #{policy.policyNumber}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Coverage Type</p>
                        <p>{policy.coverageType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={policy.status === 'active' ? 'default' : 'secondary'}>{policy.status}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Coverage Amount</p>
                        <p className="font-semibold">${policy.coverageAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly Premium</p>
                        <p className="font-semibold">${policy.premium}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Deductible</p>
                        <p>${policy.deductible}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expires</p>
                        <p>{new Date(policy.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        View Documents
                      </Button>
                      <Button variant="outline" size="sm">Renew</Button>
                      <Button variant="outline" size="sm">File Claim</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="claims" className="mt-6">
          <div className="space-y-4">
            {mockInsuranceClaims.map((claim) => {
              const policy = mockInsurancePolicies.find(p => p.id === claim.policyId);
              return (
                <Card key={claim.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                      {claim.claimType}
                    </CardTitle>
                    <CardDescription>Policy #{policy?.policyNumber}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">{claim.description}</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Incident Date</p>
                        <p>{new Date(claim.incidentDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Reported Date</p>
                        <p>{new Date(claim.reportedDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Claim Amount</p>
                        <p className="font-semibold">${claim.claimAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={
                          claim.status === 'approved' ? 'default' :
                          claim.status === 'denied' ? 'destructive' :
                          claim.status === 'paid' ? 'default' : 'secondary'
                        }>{claim.status}</Badge>
                      </div>
                    </div>
                    {claim.notes && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p>{claim.notes}</p>
                      </div>
                    )}
                    <Button variant="outline">View Details</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Insurance;