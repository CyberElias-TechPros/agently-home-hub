import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Bell,
  MessageSquare,
  UserCheck,
  Calendar,
  DollarSign,
  Settings,
  Check,
  X,
  Trash2,
  Archive,
  Star,
  Filter
} from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  type: 'message' | 'lead_update' | 'showing_scheduled' | 'commission_earned' | 'system';
  title: string;
  content: string;
  data?: any;
  read_at?: string;
  created_at: string;
}

interface NotificationCenterProps {
  token: string;
  onNotificationClick?: (notification: Notification) => void;
}

export default function NotificationCenter({ 
  token, 
  onNotificationClick 
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread' | 'message' | 'system'>('all');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/messages/notifications?unread_only=${filter === 'unread'}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.read_at).length || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch notifications',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Mark notifications as read
  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/messages/notifications/read', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notification_ids: notificationIds })
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(notification => 
          notificationIds.includes(notification.id)
            ? { ...notification, read_at: new Date().toISOString() }
            : notification
        ));
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive'
      });
    }
  };

  // Delete notifications
  const deleteNotifications = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/messages/notifications', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notification_ids: notificationIds })
      });
      
      if (response.ok) {
        setNotifications(prev => prev.filter(notification => 
          !notificationIds.includes(notification.id)
        ));
        setUnreadCount(prev => Math.max(0, prev - notificationIds.filter(id => 
          !notifications.find(n => n.id === id)?.read_at
        ).length));
        
        toast({
          title: 'Success',
          description: 'Notifications deleted successfully'
        });
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notifications',
        variant: 'destructive'
      });
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'lead_update':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'showing_scheduled':
        return <Calendar className="h-4 w-4 text-orange-500" />;
      case 'commission_earned':
        return <DollarSign className="h-4 w-4 text-purple-500" />;
      case 'system':
        return <Settings className="h-4 w-4 text-gray-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get notification color
  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return 'bg-blue-50 border-blue-200';
      case 'lead_update':
        return 'bg-green-50 border-green-200';
      case 'showing_scheduled':
        return 'bg-orange-50 border-orange-200';
      case 'commission_earned':
        return 'bg-purple-50 border-purple-200';
      case 'system':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read_at;
      case 'message':
        return notification.type === 'message';
      case 'system':
        return notification.type === 'system';
      default:
        return true;
    }
  });

  // Format notification time
  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead([notification.id]);
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  // Mark all as read
  const markAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    const allIds = notifications.map(n => n.id);
    if (allIds.length > 0) {
      deleteNotifications(allIds);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              disabled={notifications.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-1">
          {(['all', 'unread', 'message', 'system'] as const).map((filterType) => (
            <Button
              key={filterType}
              variant={filter === filterType ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(filterType)}
              className="text-xs"
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Bell className="h-12 w-12 mb-2 text-gray-300" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      !notification.read_at ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1">
                            {!notification.read_at && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatNotificationTime(notification.created_at)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.content}
                        </p>
                        
                        {notification.data && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            {Object.entries(notification.data).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-500 capitalize">{key}:</span>
                                <span className="text-gray-700">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {index < filteredNotifications.length - 1 && (
                    <Separator />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
