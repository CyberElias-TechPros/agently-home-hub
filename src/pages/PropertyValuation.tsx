import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calculator, TrendingUp, FileText, Search, AlertTriangle, CheckCircle, Eye, Download, MapPin, Home } from 'lucide-react';
import { mockPropertyValuations, mockPropertyInspections, mockValuationReports, mockValuationDisputes, mockProperties } from '@/lib/mockData';
import { calculatePropertyValuation } from '@/lib/utils';
import type { PropertyValuation, PropertyInspection, ValuationReport, ValuationDispute } from '@/types';

const PropertyValuation = () => {
  const [activeTab, setActiveTab] = useState('avm');
  const [selectedProperty, setSelectedProperty] = useState<string>('');

  const handleValuationRequest = (propertyId: string) => {
    const property = mockProperties.find(p => p.id === propertyId);
    if (property) {
      const result = calculatePropertyValuation(property, mockPropertyValuations[0].comparables, mockPropertyValuations[0].marketTrends);
      console.log('Valuation calculated:', result);
      // In real app, this would trigger API call
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Property Valuation Tools</h1>
        <p className="text-muted-foreground">Automated valuation models, comparative analysis, and expert reports</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="avm">AVM Calculator</TabsTrigger>
          <TabsTrigger value="inspection">Inspections</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="avm" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Automated Valuation Model (AVM)
                </CardTitle>
                <CardDescription>Get instant property valuations using AI and market data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="property-select">Select Property</Label>
                  <select
                    id="property-select"
                    className="w-full p-2 border rounded-md"
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                  >
                    <option value="">Choose a property...</option>
                    {mockProperties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.title} - {property.location.city}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  className="w-full"
                  onClick={() => selectedProperty && handleValuationRequest(selectedProperty)}
                  disabled={!selectedProperty}
                >
                  Calculate Valuation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Valuations</CardTitle>
                <CardDescription>Your property valuation history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockPropertyValuations.map((valuation) => {
                    const property = mockProperties.find(p => p.id === valuation.propertyId);
                    return (
                      <div key={valuation.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{property?.title}</h4>
                            <p className="text-sm text-muted-foreground">{property?.location.city}</p>
                          </div>
                          <Badge variant="secondary">{valuation.confidenceScore}% confidence</Badge>
                        </div>

                        <div className="text-2xl font-bold text-green-600 mb-2">
                          ${valuation.avmValue.toLocaleString()}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Methodology:</span>
                            <span className="uppercase">{valuation.methodology}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Valuation Date:</span>
                            <span>{new Date(valuation.valuationDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex space-x-2 mt-3">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Report
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Valuation Factors</CardTitle>
              <CardDescription>Factors influencing the property value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {mockPropertyValuations[0].factors.map((factor, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{factor.factor}</p>
                      <p className="text-sm text-muted-foreground">{factor.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          factor.impact === 'positive' ? 'default' :
                          factor.impact === 'negative' ? 'destructive' : 'secondary'
                        }
                      >
                        {factor.weight}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspection" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  Schedule Property Inspection
                </CardTitle>
                <CardDescription>Book a professional property inspection for accurate valuation</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Schedule Inspection</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inspection History</CardTitle>
                <CardDescription>View completed property inspections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockPropertyInspections.map((inspection) => {
                    const property = mockProperties.find(p => p.id === inspection.propertyId);
                    return (
                      <div key={inspection.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold">{property?.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Inspected on {new Date(inspection.inspectionDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={
                            inspection.status === 'completed' ? 'default' :
                            inspection.status === 'in_progress' ? 'secondary' : 'outline'
                          }>
                            {inspection.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Inspector</p>
                            <p>Professional Inspector #{inspection.inspectorId}</p>
                          </div>
                          {inspection.estimatedValue && (
                            <div>
                              <p className="text-sm text-muted-foreground">Estimated Value</p>
                              <p className="font-semibold">${inspection.estimatedValue.toLocaleString()}</p>
                            </div>
                          )}
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-muted-foreground mb-2">Inspection Summary</p>
                          <p className="text-sm">{inspection.notes}</p>
                        </div>

                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Full Report
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Valuation Reports
              </CardTitle>
              <CardDescription>Professional valuation reports and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockValuationReports.map((report) => {
                  const valuation = mockPropertyValuations.find(v => v.id === report.valuationId);
                  const property = valuation ? mockProperties.find(p => p.id === valuation.propertyId) : null;

                  return (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{property?.title} Valuation Report</h4>
                          <p className="text-sm text-muted-foreground">
                            Generated on {new Date(report.generatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          {report.reportType}
                        </Badge>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Executive Summary</p>
                        <p className="text-sm text-muted-foreground">{report.executiveSummary}</p>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Conclusion</p>
                        <p className="text-sm text-muted-foreground">{report.conclusion}</p>
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Full Report
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  File Valuation Dispute
                </CardTitle>
                <CardDescription>Disagree with a valuation? Submit a formal dispute</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Start Dispute Process</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Disputes</CardTitle>
                <CardDescription>Track the status of your valuation disputes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockValuationDisputes.map((dispute) => {
                    const valuation = mockPropertyValuations.find(v => v.id === dispute.valuationId);
                    const property = valuation ? mockProperties.find(p => p.id === valuation.propertyId) : null;

                    return (
                      <div key={dispute.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold">{property?.title}</h4>
                            <p className="text-sm text-muted-foreground">{dispute.reason}</p>
                          </div>
                          <Badge variant={
                            dispute.status === 'resolved' ? 'default' :
                            dispute.status === 'under_review' ? 'secondary' :
                            dispute.status === 'pending' ? 'outline' : 'destructive'
                          }>
                            {dispute.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Requested Value</p>
                            <p className="font-semibold">${dispute.requestedValue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Current Valuation</p>
                            <p className="font-semibold">${valuation?.avmValue.toLocaleString()}</p>
                          </div>
                        </div>

                        {dispute.resolution && (
                          <div className="mb-3">
                            <p className="text-sm text-muted-foreground mb-1">Resolution</p>
                            <p className="text-sm">{dispute.resolution}</p>
                          </div>
                        )}

                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Market Trends
                </CardTitle>
                <CardDescription>Property value trends and market analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockPropertyValuations[0].marketTrends.map((trend, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{trend.period}</p>
                        <p className="text-sm text-muted-foreground">
                          {trend.inventory} properties, {trend.daysOnMarket} days on market
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${trend.trend === 'up' ? 'text-green-600' : trend.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                          {trend.appreciation > 0 ? '+' : ''}{trend.appreciation}%
                        </p>
                        <Badge variant={trend.trend === 'up' ? 'default' : trend.trend === 'down' ? 'destructive' : 'secondary'}>
                          {trend.trend}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparable Analysis</CardTitle>
                <CardDescription>Properties similar to yours and their sale prices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockPropertyValuations[0].comparables.map((comp, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{comp.address}</p>
                            <p className="text-xs text-muted-foreground">
                              {comp.distance}m away • {comp.similarity}% similar
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${comp.salePrice.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            Sold {new Date(comp.saleDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {comp.adjustments.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Adjustments:</p>
                          {comp.adjustments.map((adj, adjIndex) => (
                            <p key={adjIndex} className="text-xs">
                              {adj.type}: {adj.amount > 0 ? '+' : ''}${adj.amount} ({adj.reason})
                            </p>
                          ))}
                        </div>
                      )}
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

export default PropertyValuation;