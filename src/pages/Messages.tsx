import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, Search, MessageSquare, ArrowRight, Loader2, Inbox } from 'lucide-react';
import { messagesApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn, initials, timeAgo } from '@/lib/utils';

interface Conversation {
  id: string;
  otherUser: { id: string; name: string; avatar?: string | null; role: string };
  propertyId?: string | null;
  propertyTitle?: string | null;
  lastMessage?: string | null;
  updatedAt: string;
  unreadCount: number;
}

interface Msg {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const r = await messagesApi.conversations(1, 50);
      setConversations(r.items || []);
    } catch (err: any) {
      if (err?.status !== 401) {
        toast({ title: 'Could not load messages', description: err?.message || 'Please try again.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConversations();
    const t = setInterval(loadConversations, 8000); // gentle polling
    return () => clearInterval(t);
  }, [loadConversations]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const r = await messagesApi.messages(conversationId, 1, 100);
      setMessages(r.items || []);
      // Mark incoming messages read
      const unread = (r.items || []).filter((m) => m.senderId !== user?.id && !m.read).map((m) => m.id);
      if (unread.length) messagesApi.markRead(unread).catch(() => {});
    } catch {
      /* noop */
    }
  }, [user?.id]);

  useEffect(() => {
    if (selected) {
      loadMessages(selected.id);
      const t = setInterval(() => loadMessages(selected.id), 5000);
      return () => clearInterval(t);
    }
  }, [selected, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const filtered = useMemo(
    () => conversations.filter((c) => c.otherUser?.name?.toLowerCase().includes(search.toLowerCase())),
    [conversations, search]
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selected) return;
    setSending(true);
    try {
      const r = await messagesApi.send({ receiverId: selected.otherUser.id, content: messageInput.trim(), propertyId: selected.propertyId || undefined });
      setMessages((prev) => [...prev, r.item]);
      setMessageInput('');
      loadConversations();
    } catch (err: any) {
      toast({ title: 'Message not sent', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Sign in to message</h1>
        <p className="text-muted-foreground mb-6">Chat with landlords, agents and tenants securely.</p>
        <Link to="/auth"><Button>Sign in</Button></Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] py-4 md:py-8">
      <div className="container mx-auto px-2 md:px-4 h-full">
        <Card className="h-full overflow-hidden flex flex-col md:grid md:grid-cols-[340px_1fr]">
          {/* Sidebar */}
          <div className="border-b md:border-b-0 md:border-r flex flex-col min-h-0">
            <div className="p-4 border-b space-y-3">
              <h2 className="text-2xl font-bold">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search conversations…" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              {loading && (
                <div className="p-8 flex items-center gap-2 text-muted-foreground justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Inbox className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No conversations yet.</p>
                  <p className="text-xs mt-1">Message a landlord from any property page.</p>
                </div>
              )}
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={cn(
                    'w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left',
                    selected?.id === c.id && 'bg-muted'
                  )}
                >
                  <Avatar>
                    <AvatarFallback>{initials(c.otherUser.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold truncate">{c.otherUser.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{timeAgo(c.updatedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">{c.lastMessage || (c.propertyTitle ? `About: ${c.propertyTitle}` : 'No messages yet')}</p>
                      {c.unreadCount > 0 && (
                        <Badge className="ml-2 rounded-full h-5 min-w-5 px-1.5 text-xs">{c.unreadCount}</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>

          {/* Thread */}
          <div className="flex flex-col min-h-0 flex-1">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <MessageSquare className="h-12 w-12 mb-3 opacity-40" />
                <p className="font-medium text-foreground">Select a conversation</p>
                <p className="text-sm mt-1 text-center">Your messages with landlords, agents and tenants appear here.</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar><AvatarFallback>{initials(selected.otherUser.name)}</AvatarFallback></Avatar>
                    <div>
                      <h3 className="font-semibold">{selected.otherUser.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{selected.otherUser.role}{selected.propertyTitle ? ` · ${selected.propertyTitle}` : ''}</p>
                    </div>
                  </div>
                  {selected.propertyId && <Link to={`/properties/${selected.propertyId}`} className="text-sm text-primary flex items-center gap-1 hover:underline">Property <ArrowRight className="h-3 w-3" /></Link>}
                </div>
                <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef}>
                  <div className="space-y-3">
                    {messages.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Say hello to start the conversation.</p>}
                    {messages.map((m) => {
                      const isSent = m.senderId === user.id;
                      return (
                        <div key={m.id} className={cn('flex', isSent ? 'justify-end' : 'justify-start')}>
                          <div className={cn('max-w-[75%] rounded-2xl px-4 py-2', isSent ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm')}>
                            <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                            <span className={cn('text-[10px] mt-1 block', isSent ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{formatTime(m.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <div className="p-3 border-t">
                  <form onSubmit={handleSend} className="flex gap-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message…"
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={sending || !messageInput.trim()}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return d.toLocaleString('en-NG', sameDay ? { hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
