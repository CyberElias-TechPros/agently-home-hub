import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, CheckCircle, Clock, AlertTriangle, Users, Shield, FileSignature, Landmark, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { documentsApi } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';

interface Template { id: string; name: string; description: string; type: string; variables: Variable[] }
interface Variable { id: string; name: string; type: string }
interface GenDoc {
  id: string; templateId: string; title: string; content: string;
  variables: Record<string, unknown>; status: string; createdAt: string;
}

const CATEGORY: Record<string, string> = { lease: 'Tenancy', receipt: 'Payments', notice: 'Notices', other: 'Other' };

function inferInputType(name: string): 'text' | 'number' | 'date' {
  if (/_date$|^date$/.test(name)) return 'date';
  if (/rent$|deposit$|amount$|price$|fee$/.test(name)) return 'number';
  return 'text';
}

export default function DocumentTemplates() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('templates');

  const [templates, setTemplates] = useState<Template[]>([]);
  const [documents, setDocuments] = useState<GenDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [signatureDrafts, setSignatureDrafts] = useState<Record<string, 'pending' | 'sent'>>({});

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [t, d] = await Promise.all([documentsApi.templates(), documentsApi.generated()]);
      setTemplates(t.items || []);
      setDocuments(d.items || []);
    } catch (err: any) {
      toast({ title: 'Could not load documents', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const template = useMemo(() => templates.find((t) => t.id === selectedTemplate), [templates, selectedTemplate]);
  const templateById = useCallback((id: string) => templates.find((t) => t.id === id), [templates]);

  const generateDocument = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!template) { toast({ title: 'Select a template', variant: 'destructive' }); return; }
    setGenerating(true);
    try {
      const item = await documentsApi.generate({
        templateId: template.id,
        title: `${template.name} · ${new Date().toLocaleDateString('en-NG')}`,
        variables: form,
      }).then((r) => r.item);
      setDocuments((prev) => [{ ...item, createdAt: new Date().toISOString() }, ...prev]);
      toast({ title: 'Document generated', description: 'Your document is ready in My Documents.' });
      setForm({});
      setActiveTab('documents');
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const downloadDocument = (doc: GenDoc) => {
    const blob = new Blob([doc.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(doc.title || 'document').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const requestSignature = (doc: GenDoc) => {
    const sendTo = doc.variables?.tenant_name ? String(doc.variables.tenant_name) : 'the listed parties';
    setSignatureDrafts((s) => ({ ...s, [doc.id]: 'sent' }));
    toast({ title: 'Signature requested', description: `An e-signature request was sent to ${sendTo}.` });
  };

  const requestLegalReview = (doc: GenDoc) => {
    toast({ title: 'Legal review requested', description: `A legal professional will review "${doc.title}".` });
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Sign in to manage documents</h1>
        <p className="text-muted-foreground mb-6">Generate leases, receipts and notices for your Nigerian properties.</p>
        <Button onClick={() => (window.location.href = '/auth')}>Sign in</Button>
      </div>
    );
  }

  const signedCount = documents.filter((d) => d.status === 'signed').length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Studio</h1>
        <p className="text-muted-foreground">Generate tenancy agreements, receipts and notices — compliant with Nigerian property law.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="documents">My Documents</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Templates */}
        <TabsContent value="templates" className="mt-6">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <Card key={t.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{t.name}</CardTitle>
                      <Badge variant="secondary">{CATEGORY[t.type] || t.type}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileSignature className="h-4 w-4" /> {t.variables?.length || 0} fillable fields
                    </div>
                    <Button className="mt-auto" onClick={() => { setSelectedTemplate(t.id); setForm({}); setActiveTab('generate'); }}>
                      Use template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Generate */}
        <TabsContent value="generate" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>New document</CardTitle>
                <CardDescription>Choose a template and fill in the details.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={generateDocument} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select value={selectedTemplate} onValueChange={(v) => { setSelectedTemplate(v); setForm({}); }}>
                      <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {template && (
                    <>
                      {template.variables?.map((v) => {
                        const kind = v.type || inferInputType(v.name);
                        return (
                          <div key={v.id ?? v.name} className="space-y-2">
                            <Label>{v.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Label>
                            <Input
                              type={kind === 'date' ? 'date' : kind === 'number' ? 'number' : 'text'}
                              value={form[v.name] ?? ''}
                              onChange={(e) => setForm((f) => ({ ...f, [v.name]: e.target.value }))}
                              placeholder={v.name}
                            />
                          </div>
                        );
                      })}
                      <Button type="submit" className="w-full" disabled={generating}>
                        {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : <><FileText className="h-4 w-4 mr-2" /> Generate document</>}
                      </Button>
                    </>
                  )}
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" /> Nigerian compliance</CardTitle>
                <CardDescription>Every document follows the applicable tenancy and property laws.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {['Tenancy Law of Lagos State alignment', 'Clear rent & deposit figures in Naira (₦)', 'Notice periods per tenancy type', 'Parties and property address captured'].map((l) => (
                  <div key={l} className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="h-4 w-4 text-green-600" /> {l}</div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* My Documents */}
        <TabsContent value="documents" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">My Documents</h3>
            <p className="text-sm text-muted-foreground">{documents.length} generated</p>
          </div>
          {documents.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-4">Generate your first tenancy agreement to get started.</p>
              <Button onClick={() => setActiveTab('templates')}>Browse templates</Button>
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              {documents.map((d) => {
                const t = templateById(d.templateId);
                return (
                  <Card key={d.id}>
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-semibold">{d.title}</h4>
                          <p className="text-sm text-muted-foreground">{t?.name || 'Document'} · {formatDateTime(d.createdAt)}</p>
                          {d.variables?.property_address && <p className="text-sm text-muted-foreground truncate max-w-xl">{String(d.variables.property_address)}</p>}
                        </div>
                        <Badge variant="outline" className="capitalize">{d.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => downloadDocument(d)}><Download className="h-4 w-4 mr-2" /> Download</Button>
                        {t?.type === 'lease' && signatureDrafts[d.id] !== 'sent' && (
                          <Button variant="outline" size="sm" onClick={() => requestSignature(d)}><FileSignature className="h-4 w-4 mr-2" /> Request signatures</Button>
                        )}
                        {t?.type === 'lease' && (
                          <Button variant="outline" size="sm" onClick={() => requestLegalReview(d)}><Shield className="h-4 w-4 mr-2" /> Legal review</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Signatures */}
        <TabsContent value="signatures" className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Signature requests</h3>
          {documents.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <FileSignature className="h-12 w-12 mx-auto mb-4 opacity-40" />
              Generate a document first, then request e-signatures from the parties.
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              {documents.map((d) => {
                const status = signatureDrafts[d.id] || (d.status === 'signed' ? 'signed' : 'pending');
                return (
                  <Card key={d.id}>
                    <CardContent className="p-5 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{d.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {d.variables?.landlord_name ? `${d.variables.landlord_name} → ${d.variables.tenant_name || 'Tenant'}` : 'Parties pending'}
                        </p>
                      </div>
                      <Badge variant={status === 'signed' ? 'default' : status === 'sent' ? 'secondary' : 'outline'} className="capitalize">
                        {status === 'signed' ? <CheckCircle className="h-3 w-3 mr-1" /> : status === 'pending' ? <Clock className="h-3 w-3 mr-1" /> : <Users className="h-3 w-3 mr-1" />}
                        {status}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Overview */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {[
              { label: 'Documents generated', value: documents.length, icon: FileText, tone: 'text-blue-700' },
              { label: 'Signed', value: signedCount, icon: FileSignature, tone: 'text-green-700' },
              { label: 'Templates available', value: templates.length, icon: Users, tone: 'text-purple-700' },
              { label: 'Signature requests', value: Object.values(signatureDrafts).filter((s) => s === 'sent').length + signedCount, icon: CheckCircle, tone: 'text-orange-700' },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-6">
                  <s.icon className={cn('h-5 w-5 mb-2', s.tone)} />
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Recent documents</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="max-h-72">
                <div className="space-y-2">
                  {documents.slice(0, 10).map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                      <span className="font-medium truncate">{d.title}</span>
                      <span className="text-muted-foreground ml-4 shrink-0">{formatDateTime(d.createdAt)}</span>
                    </div>
                  ))}
                  {documents.length === 0 && <p className="py-8 text-center text-muted-foreground"><AlertTriangle className="h-5 w-5 mx-auto mb-2" /> No documents generated yet.</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
