import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  FileText, 
  Trash2, 
  Eye, 
  Edit, 
  Search, 
  Filter,
  Calendar,
  Tag,
  FolderOpen,
  File,
  Plus,
  X,
  Check,
  AlertCircle,
  Clock,
  User,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';

interface Document {
  id: string;
  original_name: string;
  filename: string;
  mime_type: string;
  size: number;
  document_type: string;
  category: string;
  description: string;
  tags: string[];
  uploaded_by: number;
  property_id?: number;
  user_id?: number;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  property_title?: string;
  property_address?: string;
  uploader_name?: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'lease' | 'contract' | 'agreement' | 'disclosure' | 'addendum' | 'notice';
  type: 'residential_lease' | 'commercial_lease' | 'rental_agreement' | 'service_contract' | 'maintenance_contract' | 'eviction_notice' | 'lead_disclosure' | 'pet_agreement';
  jurisdiction: string;
  language: string;
  version: string;
  isActive: boolean;
  isCustomizable: boolean;
  requiresLegalReview: boolean;
  tags: string[];
  content: string;
  variables: TemplateVariable[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  usageCount: number;
}

interface TemplateVariable {
  name: string;
  type: 'text' | 'date' | 'number' | 'select' | 'textarea' | 'checkbox';
  label: string;
  required: boolean;
  options?: string[];
  defaultValue?: string;
}

export default function DocumentManager({ 
  propertyId, 
  userId, 
  documentType, 
  allowTemplates = false 
}: {
  propertyId?: string;
  userId?: string;
  documentType?: string;
  allowTemplates?: boolean;
}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
    if (allowTemplates) {
      fetchTemplates();
    }
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (propertyId) filters.propertyId = propertyId;
      if (userId) filters.userId = userId;
      if (documentType) filters.documentType = documentType;

      const response = await apiService.listDocuments(filters);
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await apiService.getDocumentTemplates();
      setTemplates((response || []) as DocumentTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType || 'general');
    formData.append('propertyId', propertyId || '');
    formData.append('userId', userId || '');
    formData.append('description', '');
    formData.append('tags', JSON.stringify([]));

    try {
      setUploading(true);
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const document = await response.json();
      
      toast({
        title: 'Document Uploaded',
        description: `${file.name} has been uploaded successfully.`,
      });

      setShowUploadDialog(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId: string, filename: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Download Error',
        description: 'Failed to download document.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      toast({
        title: 'Document Deleted',
        description: 'Document has been deleted successfully.',
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Delete Error',
        description: 'Failed to delete document.',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateFromTemplate = async (templateId: string, variables: any) => {
    try {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          variables,
          outputFormat: 'pdf',
          metadata: {
            propertyId,
            userId,
            tags: ['generated']
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const document = await response.json();
      
      toast({
        title: 'Document Generated',
        description: 'Document has been generated successfully.',
      });

      setShowGenerateDialog(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: 'Generation Error',
        description: 'Failed to generate document.',
        variant: 'destructive',
      });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || doc.document_type === selectedType;
    return matchesSearch && matchesType;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('docx')) return <FileText className="h-4 w-4 text-blue-500" />;
    if (mimeType.includes('image')) return <FileText className="h-4 w-4 text-green-500" />;
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const documentTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'lease', label: 'Leases' },
    { value: 'contract', label: 'Contracts' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'user-document', label: 'User Documents' },
    { value: 'template', label: 'Templates' },
    { value: 'general', label: 'General' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Document Manager
            </CardTitle>
            <div className="flex gap-2">
              {allowTemplates && (
                <Button
                  variant="outline"
                  onClick={() => setShowTemplateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Templates
                </Button>
              )}
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No documents found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {getDocumentIcon(document.mime_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{document.original_name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {document.document_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{formatFileSize(document.size)}</span>
                          {document.property_title && (
                            <span className="flex items-center gap-1">
                              <Home className="h-3 w-3" />
                              {document.property_title}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(document.created_at)}
                          </span>
                          {document.uploader_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {document.uploader_name}
                            </span>
                          )}
                        </div>
                        {document.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {document.description}
                          </p>
                        )}
                        {document.tags && document.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {document.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(document.id, document.original_name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDocument(document)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(document.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500">
                  PDF, DOC, DOCX, JPG, PNG up to 10MB
                </p>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="cursor-pointer hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                      {template.createdBy === 'system' && (
                        <Badge variant="secondary">System</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Type: {template.type}</span>
                      <span>Used: {template.usageCount} times</span>
                    </div>
                    <Button
                      className="w-full mt-4"
                      onClick={() => {
                        setShowTemplateDialog(false);
                        setShowGenerateDialog(true);
                        // Store selected template for generate dialog
                        setSelectedDocument({
                          id: template.id,
                          original_name: template.name,
                          filename: template.name,
                          mime_type: 'text/html',
                          size: 0,
                          document_type: template.type,
                          category: template.category,
                          description: template.description,
                          tags: [],
                          uploaded_by: 1,
                          is_template: true,
                          created_at: '',
                          updated_at: ''
                        } as Document);
                      }}
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate from Template Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Document from Template</DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Template: {selectedDocument.original_name}</h4>
                <p className="text-sm text-gray-600">{selectedDocument.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Document Name</label>
                  <Input
                    placeholder="Generated document name"
                    defaultValue={`Generated_${selectedDocument.original_name}_${new Date().toISOString().split('T')[0]}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Output Format</label>
                  <Select defaultValue="pdf">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="docx">DOCX</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Template Variables</label>
                <Textarea
                  placeholder="Enter template variables in JSON format"
                  rows={6}
                  defaultValue={`{
  "lease_date": "${new Date().toLocaleDateString()}",
  "property_address": "123 Main St, City, State",
  "landlord_name": "Landlord Name",
  "tenant_name": "Tenant Name"
}`}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  try {
                    const variables = JSON.parse(document.querySelector('textarea')?.value || '{}');
                    handleGenerateFromTemplate(selectedDocument.id, variables);
                  } catch (error) {
                    toast({
                      title: 'Invalid JSON',
                      description: 'Please check the template variables format.',
                      variant: 'destructive',
                    });
                  }
                }}>
                  Generate Document
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
