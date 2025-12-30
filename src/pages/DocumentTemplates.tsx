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
import { FileText, PenTool, CheckCircle, AlertTriangle, Download, Eye, Edit, Share, Lock, Unlock, Star, TrendingUp, BarChart3, Shield, Clock } from 'lucide-react';
import { mockDocumentTemplates, mockGeneratedDocuments, mockESignatureRequests, mockDocumentCompliance, mockDocumentAnalytics, mockLegalReviews } from '@/lib/mockData';
import type { DocumentTemplate, GeneratedDocument, ESignatureRequest, DocumentCompliance, DocumentAnalytics, LegalReview } from '@/types';

const DocumentTemplates = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('1');

  const templateCategories = ['lease', 'contract', 'agreement', 'disclosure', 'addendum', 'notice'];
  const jurisdictions = ['California', 'New York', 'Texas', 'Florida', 'Federal'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'review': return 'bg-yellow-500';
      case 'signed': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'non_compliant': return 'bg-red-100 text-red-800';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'requires_update': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Templates</h1>
        <p className="text-muted-foreground">Professional legal document templates with e-signature and compliance tools</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="documents">My Documents</TabsTrigger>
          <TabsTrigger value="signatures">E-Signatures</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="reviews">Legal Reviews</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Document Template Library
                </CardTitle>
                <CardDescription>Browse and use professional legal document templates</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <Label htmlFor="category-filter">Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {templateCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="jurisdiction-filter">Jurisdiction</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="All Jurisdictions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Jurisdictions</SelectItem>
                        {jurisdictions.map((jurisdiction) => (
                          <SelectItem key={jurisdiction} value={jurisdiction}>
                            {jurisdiction}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="search">Search Templates</Label>
                    <Input placeholder="Search by name or keyword..." />
                  </div>
                </div>

                {/* Template Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {mockDocumentTemplates.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <CardDescription className="line-clamp-2">
                              {template.description}
                            </CardDescription>
                          </div>
                          {template.requiresLegalReview && (
                            <Shield className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Version</span>
                            <Badge variant="outline">{template.version}</Badge>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Jurisdiction</span>
                            <span>{template.jurisdiction}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Used</span>
                            <span>{template.usageCount} times</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {template.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button size="sm" className="flex-1">
                              <PenTool className="h-4 w-4 mr-1" />
                              Use Template
                            </Button>
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

        <TabsContent value="documents" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Generated Documents
                </CardTitle>
                <CardDescription>Documents created from templates</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="mb-4">
                  <PenTool className="h-4 w-4 mr-2" />
                  Create New Document
                </Button>

                <div className="space-y-4">
                  {mockGeneratedDocuments.map((document) => {
                    const template = mockDocumentTemplates.find(t => t.id === document.templateId);
                    return (
                      <Card key={document.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{document.title}</CardTitle>
                              <CardDescription>
                                Based on: {template?.name} • Version {document.version}
                              </CardDescription>
                            </div>
                            <Badge className={getStatusColor(document.status)}>
                              {document.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Created</p>
                              <p className="font-medium">
                                {new Date(document.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Last Updated</p>
                              <p className="font-medium">
                                {new Date(document.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Parties</p>
                              <p className="font-medium">{document.parties.length}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Attachments</p>
                              <p className="font-medium">{document.attachments.length}</p>
                            </div>
                          </div>

                          {document.signedAt && (
                            <div className="mb-4 p-3 bg-green-50 rounded-lg">
                              <div className="flex items-center space-x-2 text-green-700">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  Signed on {new Date(document.signedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                            <Button variant="outline" size="sm">
                              <Share className="h-4 w-4 mr-1" />
                              Share
                            </Button>
                            <Button size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
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

        <TabsContent value="signatures" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PenTool className="h-5 w-5 mr-2" />
                  E-Signature Requests
                </CardTitle>
                <CardDescription>Track electronic signature status and reminders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockESignatureRequests.map((request) => {
                    const document = mockGeneratedDocuments.find(d => d.id === request.documentId);
                    const party = document?.parties.find(p => p.id === request.partyId);

                    return (
                      <Card key={request.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-semibold">{document?.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                Sent to: {party?.name} ({party?.email})
                              </p>
                            </div>
                            <Badge variant={
                              request.status === 'signed' ? 'default' :
                              request.status === 'viewed' ? 'secondary' :
                              request.status === 'pending' ? 'outline' : 'destructive'
                            }>
                              {request.status.replace('_', ' ')}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Sent</p>
                              <p className="font-medium">
                                {new Date(request.sentAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Expires</p>
                              <p className="font-medium">
                                {new Date(request.expiresAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Reminders</p>
                              <p className="font-medium">{request.reminderCount}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Status</p>
                              <div className="flex items-center space-x-1">
                                {request.status === 'signed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                {request.status === 'expired' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                <span className="text-sm capitalize">{request.status.replace('_', ' ')}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">View Document</Button>
                            <Button variant="outline" size="sm">Send Reminder</Button>
                            {request.status === 'pending' && (
                              <Button size="sm">Resend Request</Button>
                            )}
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

        <TabsContent value="compliance" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Document Compliance
                </CardTitle>
                <CardDescription>Legal compliance checking and requirements tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {mockDocumentCompliance.map((compliance) => {
                    const document = mockGeneratedDocuments.find(d => d.id === compliance.documentId);
                    return (
                      <Card key={compliance.documentId}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{document?.title}</CardTitle>
                              <CardDescription>Jurisdiction: {compliance.jurisdiction}</CardDescription>
                            </div>
                            <Badge className={getComplianceColor(compliance.status)}>
                              {compliance.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Compliance Requirements</p>
                              <div className="space-y-2">
                                {compliance.requirements.map((req) => (
                                  <div key={req.id} className="flex justify-between items-center p-2 border rounded">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{req.name}</p>
                                      <p className="text-xs text-muted-foreground">{req.description}</p>
                                    </div>
                                    <Badge variant={req.status === 'met' ? 'default' : 'destructive'}>
                                      {req.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {compliance.notes && (
                              <div>
                                <p className="text-sm text-muted-foreground">Notes</p>
                                <p className="text-sm">{compliance.notes}</p>
                              </div>
                            )}

                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                              <span>Checked by: Legal Team</span>
                              <span>Last checked: {new Date(compliance.checkedAt).toLocaleDateString()}</span>
                            </div>

                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">View Report</Button>
                              <Button variant="outline" size="sm">Re-check</Button>
                              {compliance.status !== 'compliant' && (
                                <Button size="sm">Fix Issues</Button>
                              )}
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

        <TabsContent value="reviews" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Legal Reviews
                </CardTitle>
                <CardDescription>Professional legal review and risk assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockLegalReviews.map((review) => {
                    const document = mockGeneratedDocuments.find(d => d.id === review.documentId);
                    return (
                      <Card key={review.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{document?.title}</CardTitle>
                              <CardDescription>
                                Requested: {new Date(review.requestedAt).toLocaleDateString()}
                                {review.completedAt && (
                                  <span className="ml-2">
                                    • Completed: {new Date(review.completedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </CardDescription>
                            </div>
                            <div className="flex space-x-2">
                              <Badge variant={
                                review.status === 'approved' ? 'default' :
                                review.status === 'rejected' ? 'destructive' :
                                review.status === 'in_progress' ? 'secondary' : 'outline'
                              }>
                                {review.status.replace('_', ' ')}
                              </Badge>
                              <Badge className={getRiskColor(review.riskLevel)}>
                                {review.riskLevel} risk
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Overall Assessment</p>
                              <p className="text-sm">{review.overallAssessment}</p>
                            </div>

                            {review.comments.length > 0 && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Review Comments</p>
                                <div className="space-y-2">
                                  {review.comments.map((comment) => (
                                    <div key={comment.id} className="p-3 border rounded">
                                      <div className="flex justify-between items-start mb-1">
                                        <p className="text-sm font-medium">{comment.section}</p>
                                        <Badge variant={
                                          comment.severity === 'error' ? 'destructive' :
                                          comment.severity === 'warning' ? 'secondary' : 'outline'
                                        }>
                                          {comment.severity}
                                        </Badge>
                                      </div>
                                      <p className="text-sm">{comment.comment}</p>
                                      {comment.suggestedChange && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Suggested: {comment.suggestedChange}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {review.recommendedChanges.length > 0 && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Recommended Changes</p>
                                <ul className="text-sm space-y-1">
                                  {review.recommendedChanges.map((change, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                      <span className="text-muted-foreground">•</span>
                                      <span>{change}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">View Full Report</Button>
                              <Button variant="outline" size="sm">Download PDF</Button>
                              {review.status === 'requires_revision' && (
                                <Button size="sm">Request Revision</Button>
                              )}
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

        <TabsContent value="analytics" className="mt-6">
          {mockDocumentAnalytics && (
            <div className="grid gap-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Documents Created</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{mockDocumentAnalytics.metrics.documentsCreated}</div>
                    <p className="text-xs text-muted-foreground">
                      +{mockDocumentAnalytics.trends.documentVolume}% from last period
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Signature Rate</CardTitle>
                    <PenTool className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{mockDocumentAnalytics.metrics.signatureRate}%</div>
                    <Progress value={mockDocumentAnalytics.metrics.signatureRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{mockDocumentAnalytics.metrics.averageCompletionTime}h</div>
                    <p className="text-xs text-muted-foreground">
                      {mockDocumentAnalytics.trends.signatureSpeed > 0 ? '+' : ''}{mockDocumentAnalytics.trends.signatureSpeed}% change
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Compliance Issues</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{mockDocumentAnalytics.metrics.complianceIssues}</div>
                    <p className="text-xs text-muted-foreground">
                      Legal review requests: {mockDocumentAnalytics.metrics.legalReviewRequests}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Template Usage</CardTitle>
                    <CardDescription>Most popular document templates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockDocumentAnalytics.metrics.templateUsage.map((usage, index) => {
                        const template = mockDocumentTemplates.find(t => t.id === usage.templateId);
                        return (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{template?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {usage.usageCount} uses • {usage.completionRate}% completion
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${usage.completionRate}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Common Customizations</CardTitle>
                    <CardDescription>Frequently modified template variables</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mockDocumentAnalytics.metrics.commonCustomizations.map((customization, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{customization.variable.replace('_', ' ')}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${(customization.frequency / Math.max(...mockDocumentAnalytics.metrics.commonCustomizations.map(c => c.frequency))) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{customization.frequency}</span>
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
      </Tabs>
    </div>
  );
};

export default DocumentTemplates;