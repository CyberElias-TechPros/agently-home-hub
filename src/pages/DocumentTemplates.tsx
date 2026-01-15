import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Upload, Edit, Eye, Share2, CheckCircle, Clock, AlertTriangle, Users, Shield, FileCheck, FileSignature } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { DocumentTemplate, GeneratedDocument, ESignatureRequest, DocumentCompliance, DocumentVersion, LegalReview, DocumentAnalytics } from '@/types';

const DocumentTemplates = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('templates');
  
  // State for document management
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
  const [signatureRequests, setSignatureRequests] = useState<ESignatureRequest[]>([]);
  const [compliance, setCompliance] = useState<DocumentCompliance[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [legalReviews, setLegalReviews] = useState<LegalReview[]>([]);
  const [analytics, setAnalytics] = useState<DocumentAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form state for document generation
  const [templateForm, setTemplateForm] = useState<Record<string, any>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [parties, setParties] = useState<Array<{ name: string, email: string, role: string }>>([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDocumentData();
    }
  }, [isAuthenticated, user]);

  const loadDocumentData = async () => {
    try {
      setLoading(true);
      const [templatesData, generatedDocsData, signatureRequestsData, complianceData, versionsData, legalReviewsData, analyticsData] = await Promise.all([
        apiService.getDocumentTemplates(),
        apiService.getGeneratedDocuments(user.id),
        apiService.getSignatureRequests(user.id),
        apiService.getDocumentCompliance(),
        apiService.getDocumentVersions(),
        apiService.getLegalReviews(),
        apiService.getDocumentAnalytics()
      ]);
      
      setTemplates(templatesData);
      setGeneratedDocs(generatedDocsData);
      setSignatureRequests(signatureRequestsData);
      setCompliance(complianceData);
      setVersions(versionsData);
      setLegalReviews(legalReviewsData);
      setAnalytics(analyticsData);
    } catch (error) {
      toast({
        title: "Error loading document data",
        description: "Failed to load document information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateDocument = async () => {
    try {
      setLoading(true);
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) throw new Error("Template not found");

      const document = await apiService.generateDocument({
        templateId: selectedTemplate,
        title: `${template.name} - ${new Date().toLocaleDateString()}`,
        variables: templateForm,
        parties: parties,
        status: 'draft',
        version: 1,
        createdAt: new Date().toISOString(),
        createdBy: user.id
      });
      
      setGeneratedDocs([...generatedDocs, document]);
      toast({
        title: "Document Generated",
        description: "Your document has been created successfully!",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Please check your inputs and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const requestSignature = async (documentId: string) => {
    try {
      setLoading(true);
      const signatureRequest = await apiService.requestSignature({
        documentId,
        partyId: parties[0].email, // First party
        status: 'pending',
        sentAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });
      
      setSignatureRequests([...signatureRequests, signatureRequest]);
      toast({
        title: "Signature Requested",
        description: "Signature request has been sent to all parties.",
      });
    } catch (error) {
      toast({
        title: "Signature Request Failed",
        description: "Please check the document and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (documentId: string) => {
    try {
      setLoading(true);
      await apiService.downloadDocument(documentId);
      toast({
        title: "Download Started",
        description: "Your document is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const requestLegalReview = async (documentId: string) => {
    try {
      setLoading(true);
      const review = await apiService.requestLegalReview({
        documentId,
        reviewerId: 'lawyer1', // Default reviewer
        status: 'pending',
        requestedAt: new Date().toISOString(),
        comments: []
      });
      
      setLegalReviews([...legalReviews, review]);
      toast({
        title: "Legal Review Requested",
        description: "A legal professional will review your document.",
      });
    } catch (error) {
      toast({
        title: "Review Request Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTemplateById = (templateId: string) => {
    return templates.find(t => t.id === templateId);
  };

  const getDocumentById = (documentId: string) => {
    return generatedDocs.find(d => d.id === documentId);
  };

  const getSignatureRequestsByDocument = (documentId: string) => {
    return signatureRequests.filter(sr => sr.documentId === documentId);
  };

  const getVersionsByDocument = (documentId: string) => {
    return versions.filter(v => v.documentId === documentId);
  };

  const getLegalReviewByDocument = (documentId: string) => {
    return legalReviews.find(lr => lr.documentId === documentId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Templates & E-Signatures</h1>
        <p className="text-muted-foreground">Generate, sign, and manage legal documents</p>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to access document services.</p>
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="generate">Generate Document</TabsTrigger>
            <TabsTrigger value="documents">My Documents</TabsTrigger>
            <TabsTrigger value="signatures">Signatures</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-48 bg-muted rounded mb-4"></div>
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded mb-4"></div>
                      <div className="flex justify-between">
                        <div className="h-8 bg-muted rounded w-16"></div>
                        <div className="h-8 bg-muted rounded w-16"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : templates.length > 0 ? (
                templates.map((template) => (
                  <Card key={template.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">{template.name}</h4>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        </div>
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Category:</span>
                          <span className="ml-2 font-medium">{template.category}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <span className="ml-2 font-medium">{template.type}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Language:</span>
                          <span className="ml-2 font-medium">{template.language}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Version:</span>
                          <span className="ml-2 font-medium">{template.version}</span>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" checked={template.isCustomizable} readOnly />
                          <span className="text-sm">Customizable</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" checked={template.requiresLegalReview} readOnly />
                          <span className="text-sm">Legal Review Required</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedTemplate(template.id);
                          setActiveTab('generate');
                        }}>
                          <FileText className="h-4 w-4 mr-2" />
                          Use Template
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Templates Available</h3>
                    <p className="text-muted-foreground">Contact support to access document templates.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="generate" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Document Generation
                  </CardTitle>
                  <CardDescription>Fill in the details to generate your document</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); generateDocument(); }} className="space-y-4">
                    <div>
                      <Label htmlFor="template-select">Select Template</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger id="template-select">
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTemplate && (
                      <>
                        <div className="space-y-4">
                          <h4 className="font-semibold">Document Variables</h4>
                          {getTemplateById(selectedTemplate)?.variables.map((variable) => (
                            <div key={variable.id}>
                              <Label htmlFor={variable.id}>{variable.label}</Label>
                              {variable.type === 'text' && (
                                <Input
                                  id={variable.id}
                                  type="text"
                                  value={templateForm[variable.id] || ''}
                                  onChange={(e) => setTemplateForm({...templateForm, [variable.id]: e.target.value})}
                                  placeholder={variable.label}
                                  required={variable.required}
                                />
                              )}
                              {variable.type === 'number' && (
                                <Input
                                  id={variable.id}
                                  type="number"
                                  value={templateForm[variable.id] || ''}
                                  onChange={(e) => setTemplateForm({...templateForm, [variable.id]: parseFloat(e.target.value)})}
                                  placeholder={variable.label}
                                  required={variable.required}
                                />
                              )}
                              {variable.type === 'date' && (
                                <Input
                                  id={variable.id}
                                  type="date"
                                  value={templateForm[variable.id] || ''}
                                  onChange={(e) => setTemplateForm({...templateForm, [variable.id]: e.target.value})}
                                  required={variable.required}
                                />
                              )}
                              {variable.type === 'select' && (
                                <Select
                                  value={templateForm[variable.id] || ''}
                                  onValueChange={(value) => setTemplateForm({...templateForm, [variable.id]: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={variable.label} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {variable.validation?.options?.map((option) => (
                                      <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {variable.type === 'boolean' && (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={templateForm[variable.id] || false}
                                    onChange={(e) => setTemplateForm({...templateForm, [variable.id]: e.target.checked})}
                                  />
                                  <Label>{variable.label}</Label>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-semibold">Parties</h4>
                          {parties.map((party, index) => (
                            <div key={index} className="grid grid-cols-3 gap-2">
                              <Input
                                placeholder="Name"
                                value={party.name}
                                onChange={(e) => {
                                  const newParties = [...parties];
                                  newParties[index].name = e.target.value;
                                  setParties(newParties);
                                }}
                              />
                              <Input
                                placeholder="Email"
                                value={party.email}
                                onChange={(e) => {
                                  const newParties = [...parties];
                                  newParties[index].email = e.target.value;
                                  setParties(newParties);
                                }}
                              />
                              <Select
                                value={party.role}
                                onValueChange={(value) => {
                                  const newParties = [...parties];
                                  newParties[index].role = value;
                                  setParties(newParties);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="tenant">Tenant</SelectItem>
                                  <SelectItem value="landlord">Landlord</SelectItem>
                                  <SelectItem value="buyer">Buyer</SelectItem>
                                  <SelectItem value="seller">Seller</SelectItem>
                                  <SelectItem value="agent">Agent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setParties([...parties, { name: '', email: '', role: 'tenant' }])}
                          >
                            Add Party
                          </Button>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              Generate Document
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </form>
                </CardContent>
              </Card>

              {selectedTemplate && (
                <Card>
                  <CardHeader>
                    <CardTitle>Template Preview</CardTitle>
                    <CardDescription>Preview of your generated document</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">{getTemplateById(selectedTemplate)?.name}</h4>
                        <p className="text-sm text-muted-foreground">{getTemplateById(selectedTemplate)?.description}</p>
                      </div>
                      
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Variables:</span>
                          <span>{getTemplateById(selectedTemplate)?.variables.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Customizable:</span>
                          <span>{getTemplateById(selectedTemplate)?.isCustomizable ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Legal Review:</span>
                          <span>{getTemplateById(selectedTemplate)?.requiresLegalReview ? 'Required' : 'Optional'}</span>
                        </div>
                      </div>

                      {getTemplateById(selectedTemplate)?.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {getTemplateById(selectedTemplate)?.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">My Documents</h3>
                <div className="text-sm text-muted-foreground">
                  {generatedDocs.length} documents • {generatedDocs.filter(d => d.status === 'signed').length} signed
                </div>
              </div>

              {generatedDocs.length > 0 ? (
                <div className="space-y-4">
                  {generatedDocs.map((document) => {
                    const signatureRequests = getSignatureRequestsByDocument(document.id);
                    const versions = getVersionsByDocument(document.id);
                    const legalReview = getLegalReviewByDocument(document.id);
                    
                    return (
                      <Card key={document.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{document.title}</h4>
                              <p className="text-sm text-muted-foreground mb-2">{document.parties.map(p => p.name).join(' • ')}</p>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Template:</span>
                                  <span className="ml-2 font-medium">{getTemplateById(document.templateId)?.name}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Status:</span>
                                  <Badge variant={
                                    document.status === 'signed' ? 'default' :
                                    document.status === 'draft' ? 'secondary' :
                                    document.status === 'pending' ? 'outline' : 'destructive'
                                  }>
                                    {document.status}
                                  </Badge>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Version:</span>
                                  <span className="ml-2 font-medium">{document.version}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Created:</span>
                                  <span className="ml-2 font-medium">{new Date(document.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>

                              {document.attachments.length > 0 && (
                                <div className="mb-4">
                                  <span className="text-sm text-muted-foreground">Attachments:</span>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {document.attachments.map((attachment, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {attachment.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Parties: {document.parties.length}</div>
                              <div className="text-sm text-muted-foreground">Signatures: {signatureRequests.filter(sr => sr.status === 'signed').length}</div>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => downloadDocument(document.id)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            {document.status === 'draft' && (
                              <Button variant="outline" size="sm" onClick={() => requestSignature(document.id)}>
                                <FileSignature className="h-4 w-4 mr-2" />
                                Request Signatures
                              </Button>
                            )}
                            {getTemplateById(document.templateId)?.requiresLegalReview && !legalReview && (
                              <Button variant="outline" size="sm" onClick={() => requestLegalReview(document.id)}>
                                <Shield className="h-4 w-4 mr-2" />
                                Legal Review
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
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
                    <h3 className="text-lg font-semibold mb-2">No Documents</h3>
                    <p className="text-muted-foreground mb-4">Generate your first document to get started.</p>
                    <Button onClick={() => setActiveTab('templates')}>Browse Templates</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="signatures" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Signature Requests</h3>
              
              {signatureRequests.length > 0 ? (
                <div className="space-y-4">
                  {signatureRequests.map((request) => {
                    const document = getDocumentById(request.documentId);
                    
                    return (
                      <Card key={request.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-semibold">{document?.title}</h4>
                              <p className="text-sm text-muted-foreground">Document: {document?.templateId}</p>
                            </div>
                            <Badge variant={
                              request.status === 'signed' ? 'default' :
                              request.status === 'pending' ? 'secondary' :
                              request.status === 'viewed' ? 'outline' : 'destructive'
                            }>
                              {request.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Party:</span>
                              <span className="ml-2 font-medium">{document?.parties.find(p => p.email === request.partyId)?.name}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Sent:</span>
                              <span className="ml-2 font-medium">{new Date(request.sentAt).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Expires:</span>
                              <span className="ml-2 font-medium">{new Date(request.expiresAt).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reminder Count:</span>
                              <span className="ml-2 font-medium">{request.reminderCount}</span>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Document
                            </Button>
                            {request.status === 'pending' && (
                              <Button size="sm">
                                <FileSignature className="h-4 w-4 mr-2" />
                                Send Reminder
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
                    <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Signature Requests</h3>
                    <p className="text-muted-foreground">Request signatures on your documents to see them here.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Document Compliance</h3>
              
              {compliance.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {compliance.map((comp) => (
                    <Card key={comp.documentId}>
                      <CardHeader>
                        <CardTitle className="text-lg">Compliance Check</CardTitle>
                        <CardDescription>Document: {comp.documentId}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Badge variant={
                              comp.status === 'compliant' ? 'default' :
                              comp.status === 'warnings' ? 'secondary' : 'destructive'
                            }>
                              {comp.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">Checked: {new Date(comp.checkedAt).toLocaleDateString()}</span>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-medium">Requirements</h4>
                            {comp.requirements.map((req, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                <div>
                                  <span className="text-sm font-medium">{req.name}</span>
                                  <p className="text-xs text-muted-foreground">{req.description}</p>
                                </div>
                                <Badge variant={req.status === 'met' ? 'default' : 'destructive'}>
                                  {req.status}
                                </Badge>
                              </div>
                            ))}
                          </div>

                          {comp.recommendedActions.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium">Recommended Actions</h4>
                              <div className="space-y-1">
                                {comp.recommendedActions.map((action, index) => (
                                  <div key={index} className="flex items-center space-x-2 text-sm">
                                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                                    <span>{action}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Compliance Checks</h3>
                    <p className="text-muted-foreground">Compliance checks will appear here after document generation.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Document Analytics</h3>
              
              {analytics ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Document Metrics</CardTitle>
                      <CardDescription>Overall document statistics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">{analytics.metrics.documentsCreated}</div>
                            <div className="text-sm text-blue-700">Documents Created</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-700">{analytics.metrics.documentsSigned}</div>
                            <div className="text-sm text-green-700">Documents Signed</div>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-700">{analytics.metrics.signatureRate}%</div>
                            <div className="text-sm text-purple-700">Signature Rate</div>
                          </div>
                          <div className="text-center p-4 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-700">{analytics.metrics.averageCompletionTime}h</div>
                            <div className="text-sm text-orange-700">Avg Completion Time</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Template Usage</CardTitle>
                      <CardDescription>Most popular templates</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.metrics.templateUsage.map((template, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-muted rounded">
                            <div>
                              <span className="font-medium">{template.templateId}</span>
                              <p className="text-sm text-muted-foreground">{template.usageCount} uses</p>
                            </div>
                            <Badge variant="outline" className="text-xs">{template.completionRate}%</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Common Customizations</CardTitle>
                      <CardDescription>Frequently modified variables</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.metrics.commonCustomizations.map((customization, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-muted rounded">
                            <span className="font-medium">{customization.variable}</span>
                            <span className="text-sm text-muted-foreground">{customization.frequency} times</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Compliance Issues</CardTitle>
                      <CardDescription>Common compliance problems</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.complianceIssues.map((issue, index) => (
                          <div key={index} className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="text-sm">{issue}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Legal Review Requests</CardTitle>
                      <CardDescription>Documents requiring legal review</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.legalReviewRequests.map((request, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <span className="text-sm">{request}</span>
                            <Badge variant="outline" className="text-xs">Review Needed</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Trends</CardTitle>
                      <CardDescription>Document usage trends</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Document Volume</span>
                          <Badge variant={analytics.trends.documentVolume > 0 ? 'default' : 'destructive'}>
                            {analytics.trends.documentVolume > 0 ? '+' : ''}{analytics.trends.documentVolume}%
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Completion Rate</span>
                          <Badge variant={analytics.trends.completionRate > 0 ? 'default' : 'destructive'}>
                            {analytics.trends.completionRate > 0 ? '+' : ''}{analytics.trends.completionRate}%
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Signature Speed</span>
                          <Badge variant={analytics.trends.signatureSpeed > 0 ? 'default' : 'destructive'}>
                            {analytics.trends.signatureSpeed > 0 ? '+' : ''}{analytics.trends.signatureSpeed}%
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
                    <p className="text-muted-foreground">Analytics will be available after generating documents.</p>
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

export default DocumentTemplates;