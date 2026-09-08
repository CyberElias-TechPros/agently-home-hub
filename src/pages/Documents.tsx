import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Trash2, UploadCloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useSEO } from '@/lib/seo/useSEO';
import { formatDate } from '@/lib/format';
import { documentKeys } from '@/lib/query-keys';
import { documentsApi } from '@/lib/api';
import type { DocumentCategory } from '@/lib/api/types';

const CATEGORIES: DocumentCategory[] = [
  'lease',
  'identity',
  'proof_of_income',
  'inspection',
  'receipt',
  'insurance',
  'other',
];

const MAX_BYTES = 10 * 1024 * 1024; // matches MAX_UPLOAD_BYTES on the API
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  useSEO({ title: 'Documents', description: 'Store and download your tenancy documents.', canonicalPath: '/documents', noindex: true });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<DocumentCategory>('lease');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<'all' | DocumentCategory>('all');

  const documents = useQuery({
    queryKey: documentKeys.all,
    queryFn: () => documentsApi.list().then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      toast({ title: 'Document deleted' });
      void queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
    onError: (error: Error) =>
      toast({ title: 'Could not delete document', description: error.message, variant: 'destructive' }),
  });

  const download = async (id: string, name: string) => {
    try {
      const { data } = await documentsApi.download(id);
      const link = window.document.createElement('a');
      link.href = data.url;
      link.download = name;
      link.rel = 'noopener';
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast({
        title: 'Could not download document',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    }
  };

  /**
   * Two-step upload: ask the API for a signed PUT URL, push the bytes straight
   * to object storage, then confirm. The file never transits the API worker,
   * which keeps the 10 MB limit meaningful and the request cheap.
   */
  const upload = async (file: File) => {
    if (!ALLOWED_MIME.includes(file.type)) {
      toast({
        title: 'Unsupported file type',
        description: 'Upload a PDF, image, spreadsheet, text or Word document.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({
        title: 'File too large',
        description: `Documents are limited to ${formatBytes(MAX_BYTES)}.`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setProgress(10);
    try {
      const intent = await documentsApi.createUploadIntent({
        name: file.name,
        category,
        mime_type: file.type,
        size_bytes: file.size,
      });

      setProgress(40);
      const response = await fetch(intent.data.upload_url, {
        method: intent.data.method,
        headers: intent.data.required_headers,
        body: file,
      });
      if (!response.ok) {
        throw new Error('The storage service rejected the upload. Please try again.');
      }

      setProgress(80);
      await documentsApi.complete(intent.data.document.id);
      setProgress(100);
      toast({ title: 'Document uploaded', description: file.name });
      void queryClient.invalidateQueries({ queryKey: documentKeys.all });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const visible = (documents.data ?? []).filter(
    (document) => filter === 'all' || document.category === filter
  );

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Keep your lease, receipts and inspection reports together and safely stored.
        </p>
      </header>

      <Card className="mb-8">
        <CardContent className="flex flex-wrap items-end gap-4 p-6">
          <div className="min-w-[200px] flex-1">
            <Label htmlFor="document-category">Upload as</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}>
              <SelectTrigger id="document-category" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Label htmlFor="document-file">Choose a file</Label>
            <Input
              id="document-file"
              ref={fileInput}
              type="file"
              className="mt-1.5"
              accept={ALLOWED_MIME.join(',')}
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, images, spreadsheets or text up to {formatBytes(MAX_BYTES)}.
            </p>
          </div>

          <Button disabled={uploading} onClick={() => fileInput.current?.click()}>
            <UploadCloud className="mr-2 h-4 w-4" aria-hidden="true" />
            {uploading ? 'Uploading…' : 'Upload document'}
          </Button>
        </CardContent>
        {uploading && <Progress value={progress} className="h-1 rounded-none" />}
      </Card>

      <div className="mb-6 flex flex-wrap gap-2">
        {(['all', ...CATEGORIES] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? 'default' : 'outline'}
            onClick={() => setFilter(value)}
            className="capitalize"
          >
            {value === 'all' ? 'All' : value.replace(/_/g, ' ')}
          </Button>
        ))}
      </div>

      {documents.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : documents.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center text-destructive">
          We could not load your documents. Please try again.
        </p>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="font-medium">No documents yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your first document to keep it safe with your tenancy record.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((document) => (
            <li key={document.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{document.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatBytes(document.size_bytes)} · {formatDate(document.created_at)}
                    </p>
                  </div>

                  <Badge variant="secondary" className="capitalize">
                    {document.category.replace(/_/g, ' ')}
                  </Badge>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void download(document.id, document.name)}
                    >
                      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(document.id)}
                      aria-label={`Delete ${document.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
