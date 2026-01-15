import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Search, 
  Phone, 
  Video, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Check, 
  CheckCheck,
  Users,
  Bell,
  Settings,
  Archive,
  Star,
  Info
} from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  property_id?: string;
  lead_id?: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  content: string;
  metadata?: any;
  read_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
  attachments?: {
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    thumbnail_path?: string;
  }[];
}

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  property_id?: string;
  last_message_id?: string;
  last_message_at?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  last_message_content?: string;
  participant_1_first_name?: string;
  participant_1_last_name?: string;
  participant_1_email?: string;
  participant_2_first_name?: string;
  participant_2_last_name?: string;
  participant_2_email?: string;
  property_title?: string;
  property_address?: string;
  unread_count?: number;
}

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

interface OnlineUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  socketId: string;
  connectedAt: string;
}

interface MessagingInterfaceProps {
  currentUserId: string;
  currentUserRole: string;
  token: string;
}

export default function MessagingInterface({ 
  currentUserId, 
  currentUserRole, 
  token 
}: MessagingInterfaceProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Initialize Socket.io connection
  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:3001', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to messaging server');
      setIsConnected(true);
      newSocket.emit('get_unread_count');
      newSocket.emit('get_online_users');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from messaging server');
      setIsConnected(false);
    });

    newSocket.on('new_message', (data) => {
      const { message, conversation_id, sender } = data;
      
      if (selectedConversation?.id === conversation_id) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
        
        // Mark message as read
        newSocket.emit('mark_read', { messageIds: [message.id] });
      } else {
        // Update conversation list
        fetchConversations();
        setUnreadCount(prev => prev + 1);
      }

      toast({
        title: 'New Message',
        description: `Message from ${sender.first_name} ${sender.last_name}`,
      });
    });

    newSocket.on('messages_read', (data) => {
      const { messageIds, readBy, readAt } = data;
      setMessages(prev => prev.map(msg => 
        messageIds.includes(msg.id) 
          ? { ...msg, read_at: readAt }
          : msg
      ));
    });

    newSocket.on('user_typing', (data) => {
      const { userId, conversationId, typing } = data;
      if (selectedConversation?.id === conversationId) {
        setIsTyping(prev => ({ ...prev, [userId]: typing }));
      }
    });

    newSocket.on('user_online', (data) => {
      const { userId, conversationId } = data;
      // Update online status in conversation
      setConversations(prev => prev.map(conv => {
        if (conv.id === conversationId) {
          return { ...conv, online: true };
        }
        return conv;
      }));
    });

    newSocket.on('user_offline', (data) => {
      const { userId, conversationId } = data;
      // Update online status in conversation
      setConversations(prev => prev.map(conv => {
        if (conv.id === conversationId) {
          return { ...conv, online: false };
        }
        return conv;
      }));
    });

    newSocket.on('online_users', (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    newSocket.on('unread_count', (data) => {
      setUnreadCount(data.count);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      toast({
        title: 'Connection Error',
        description: error.message,
        variant: 'destructive'
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token, toast]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [token]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [token]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/messages/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [token]);

  // Initial data fetch
  useEffect(() => {
    fetchConversations();
    fetchNotifications();
  }, [fetchConversations, fetchNotifications]);

  // Handle conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
    
    // Join conversation room
    if (socket) {
      socket.emit('join_conversation', conversation.id);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !socket) return;

    const otherParticipant = selectedConversation.participant_1_id === currentUserId 
      ? selectedConversation.participant_2_id 
      : selectedConversation.participant_1_id;

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiver_id: otherParticipant,
          message_type: 'text',
          content: newMessage.trim(),
          property_id: selectedConversation.property_id
        })
      });

      if (response.ok) {
        setNewMessage('');
        // Socket.io will handle the real-time update
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    }
  };

  // Handle typing indicators
  const handleTypingStart = () => {
    if (socket && selectedConversation) {
      socket.emit('typing_start', { conversationId: selectedConversation.id });
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { conversationId: selectedConversation.id });
      }, 3000);
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Format message time
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get other participant info
  const getOtherParticipant = (conversation: Conversation) => {
    const isParticipant1 = conversation.participant_1_id === currentUserId;
    return {
      id: isParticipant1 ? conversation.participant_2_id : conversation.participant_1_id,
      first_name: isParticipant1 ? conversation.participant_2_first_name : conversation.participant_1_first_name,
      last_name: isParticipant1 ? conversation.participant_2_last_name : conversation.participant_1_last_name,
      email: isParticipant1 ? conversation.participant_2_email : conversation.participant_1_email,
    };
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const participant = getOtherParticipant(conv);
    const searchLower = searchTerm.toLowerCase();
    return (
      participant.first_name?.toLowerCase().includes(searchLower) ||
      participant.last_name?.toLowerCase().includes(searchLower) ||
      participant.email?.toLowerCase().includes(searchLower) ||
      conv.property_title?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Messages</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
              >
                <Users className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Notifications Panel */}
        {showNotifications && (
          <div className="border-b border-gray-200 p-4 bg-gray-50">
            <h3 className="font-medium mb-2">Notifications</h3>
            <ScrollArea className="h-32">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500">No notifications</p>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className="p-2 hover:bg-gray-100 rounded cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-gray-600">{notification.content}</p>
                      </div>
                      {!notification.read_at && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        )}

        {/* Online Users Panel */}
        {showOnlineUsers && (
          <div className="border-b border-gray-200 p-4 bg-gray-50">
            <h3 className="font-medium mb-2">Online Users ({onlineUsers.length})</h3>
            <ScrollArea className="h-32">
              {onlineUsers.length === 0 ? (
                <p className="text-sm text-gray-500">No users online</p>
              ) : (
                onlineUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-gray-600">{user.role}</p>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        )}

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const participant = getOtherParticipant(conversation);
              const isSelected = selectedConversation?.id === conversation.id;
              
              return (
                <div
                  key={conversation.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer border-l-4 transition-colors ${
                    isSelected ? 'bg-blue-50 border-blue-500' : 'border-transparent'
                  }`}
                  onClick={() => handleSelectConversation(conversation)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" />
                      <AvatarFallback>
                        {participant.first_name?.[0]}{participant.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium truncate">
                          {participant.first_name} {participant.last_name}
                        </h4>
                        {conversation.last_message_at && (
                          <span className="text-xs text-gray-500">
                            {formatMessageTime(conversation.last_message_at)}
                          </span>
                        )}
                      </div>
                      
                      {conversation.property_title && (
                        <p className="text-xs text-blue-600 mb-1 truncate">
                          {conversation.property_title}
                        </p>
                      )}
                      
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.last_message_content || 'No messages yet'}
                      </p>
                    </div>
                    
                    {conversation.unread_count > 0 && (
                      <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {getOtherParticipant(selectedConversation).first_name?.[0]}
                      {getOtherParticipant(selectedConversation).last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h3 className="font-medium">
                      {getOtherParticipant(selectedConversation).first_name} {getOtherParticipant(selectedConversation).last_name}
                    </h3>
                    {selectedConversation.property_title && (
                      <p className="text-sm text-blue-600">{selectedConversation.property_title}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-gray-50">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === currentUserId;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            isOwn 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-white border border-gray-200'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          
                          <div className={`flex items-center justify-end gap-1 mt-1 ${
                            isOwn ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            <span className="text-xs">
                              {formatMessageTime(message.created_at)}
                            </span>
                            {isOwn && (
                              <>
                                {message.read_at ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : message.delivered_at ? (
                                  <Check className="h-3 w-3" />
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Typing Indicator */}
                {Object.values(isTyping).some(typing => typing) && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Smile className="h-4 w-4" />
                </Button>
                
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  onFocus={handleTypingStart}
                  className="flex-1"
                />
                
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !isConnected}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {!isConnected && (
                <p className="text-xs text-red-500 mt-2">Connecting to server...</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
