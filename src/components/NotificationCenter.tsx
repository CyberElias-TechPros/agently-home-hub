import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Calendar,
  CheckCheck,
  DollarSign,
  Info,
  MessageSquare,
  UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { notificationsApi } from '@/lib/api';
import type { Notification } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const ICONS: Record<string, typeof Bell> = {
  message: MessageSquare,
  booking_requested: Calendar,
  booking_approved: Calendar,
  booking_declined: Calendar,
  maintenance_created: Info,
  maintenance_updated: Info,
  lead_assigned: UserCheck,
  commission_earned: DollarSign,
};

/**
 * Header notification bell.
 *
 * Previously this component fetched a non-existent endpoint with a hand-rolled
 * `fetch` and a manually threaded token; it now uses the shared API client, so
 * refresh, error handling and sign-out-on-401 all behave like the rest of the
 * app. The unread badge is driven by a cheap count endpoint that is polled
 * rather than by loading the whole list.
 */
export function NotificationCenter() {
  const queryClient = useQueryClient();

  const countQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data.count),
    refetchInterval: 60_000,
  });

  const listQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: invalidate,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: invalidate,
  });

  const unread = countQuery.data ?? 0;
  const notifications = listQuery.data ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}>
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />

        {listQuery.isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            You have no notifications yet.
          </p>
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onRead={() => markRead.mutate(notification.id)}
                />
              ))}
            </ul>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: () => void;
}) {
  const Icon = ICONS[notification.type] ?? Info;
  const isUnread = notification.read_at === null;
  const href = linkFor(notification);

  const content = (
    <button
      type="button"
      onClick={onRead}
      className={cn(
        'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60',
        isUnread && 'bg-accent/5'
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{notification.title}</span>
          {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
        </span>
        {notification.body && (
          <span className="mt-0.5 block text-xs text-muted-foreground">{notification.body}</span>
        )}
        <span className="mt-1 block text-xs text-muted-foreground/70">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </span>
      </span>
    </button>
  );

  return (
    <li>
      {href ? (
        <Link to={href} onClick={onRead} className="block">
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  );
}

/** Deep-links a notification to the screen that can act on it. */
function linkFor(notification: Notification): string | null {
  if (notification.resource_type === 'conversation') return '/messages';
  if (notification.resource_type === 'booking') return '/bookings';
  if (notification.resource_type === 'maintenance_request') return '/maintenance';
  if (notification.resource_type === 'document') return '/documents';
  return null;
}
