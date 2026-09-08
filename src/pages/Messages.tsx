import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { MessageSquare, Send } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useSEO } from '@/lib/seo/useSEO';
import { conversationKeys } from '@/lib/query-keys';
import { messagesApi } from '@/lib/api';
import type { Conversation, Message } from '@/lib/api/types';
import { cn } from '@/lib/utils';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Messages() {
  useSEO({ title: 'Messages', description: 'Your conversations with landlords, tenants and agents.', canonicalPath: '/messages', noindex: true });

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversations = useQuery({
    queryKey: conversationKeys.all,
    queryFn: () => messagesApi.conversations().then((r) => r.data),
    // Light polling: there is no push channel wired to the browser yet, and
    // 10s keeps the delay noticeable without hammering the API.
    refetchInterval: 10_000,
  });

  const list = conversations.data ?? [];
  const active = list.find((conversation) => conversation.id === activeId) ?? list[0] ?? null;

  const messages = useQuery({
    queryKey: conversationKeys.messages(active?.id ?? 'none'),
    queryFn: () => messagesApi.messages(active!.id).then((r) => r.data),
    enabled: active !== null,
    refetchInterval: 10_000,
  });

  const send = useMutation({
    mutationFn: (content: string) => messagesApi.send(active!.id, content),
    onSuccess: () => {
      setDraft('');
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.messages(active!.id),
      });
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    },
  });

  // Mark the open thread read so the header badge stops counting it.
  useEffect(() => {
    if (!active?.id) return;
    void messagesApi
      .markRead(active.id)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      .catch(() => {
        /* Marking read is best-effort; the thread still renders. */
      });
  }, [active?.id, queryClient]);

  // Keep the newest message in view.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.data]);

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="mt-1 text-muted-foreground">
          Conversations with the people you rent from, rent to, or work with.
        </p>
      </header>

      <Card className="overflow-hidden">
        <div className="grid h-[70vh] md:grid-cols-[300px_1fr]">
          {/* Thread list */}
          <div className="hidden flex-col border-r md:flex">
            {conversations.isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : list.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                You have no conversations yet. Message a landlord from a property page to start one.
              </p>
            ) : (
              <ul className="overflow-y-auto">
                {list.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(conversation.id)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b p-4 text-left transition-colors hover:bg-muted/60',
                        active?.id === conversation.id && 'bg-muted'
                      )}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initials(otherName(conversation) ?? 'User')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {otherName(conversation) ?? 'Conversation'}
                          </span>
                          {conversation.last_message_at && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conversation.last_message_at), {
                                addSuffix: false,
                              })}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {conversation.last_message_preview ?? 'No messages yet'}
                        </span>
                      </span>
                      {(conversation.unread_count ?? 0) > 0 && (
                        <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground">
                          {conversation.unread_count}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Thread */}
          <div className="flex flex-col">
            {!active ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                <p className="font-medium">No conversation selected</p>
                <p className="text-sm text-muted-foreground">
                  {list.length === 0
                    ? 'Message a landlord from a property page to start one.'
                    : 'Choose a conversation to read it.'}
                </p>
              </div>
            ) : (
              <>
                <div className="border-b p-4">
                  <p className="font-medium">{otherName(active) ?? 'Conversation'}</p>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
                  {messages.isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-2/3" />
                      <Skeleton className="h-10 w-1/2" />
                    </div>
                  ) : (messages.data ?? []).length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No messages yet. Say hello.
                    </p>
                  ) : (
                    (messages.data ?? []).map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.sender_id === user?.id}
                      />
                    ))
                  )}
                </div>

                <form
                  className="flex gap-2 border-t p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const content = draft.trim();
                    if (!content || send.isPending) return;
                    send.mutate(content);
                  }}
                >
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a message…"
                    aria-label="Message"
                    autoComplete="off"
                  />
                  <Button type="submit" disabled={send.isPending || draft.trim().length === 0}>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Send message</span>
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/** The API resolves exactly the person you are talking to. */
function otherName(conversation: Conversation): string | null {
  return conversation.counterpart?.name ?? null;
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={cn(
            'mt-1 text-[11px]',
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {format(new Date(message.created_at), 'p')}
        </p>
      </div>
    </div>
  );
}
