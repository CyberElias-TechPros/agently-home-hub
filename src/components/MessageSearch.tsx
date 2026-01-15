import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Filter,
  Calendar,
  MessageSquare,
  User,
  Building,
  Clock,
  ExternalLink,
  X
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
  conversation_id?: string;
  property_title?: string;
}

interface MessageSearchProps {
  token: string;
  onMessageSelect?: (message: Message) => void;
}

export default function MessageSearch({ 
  token, 
  onMessageSelect 
}: MessageSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'all', // 'all', 'today', 'week', 'month'
    messageType: 'all', // 'all', 'text', 'image', 'file'
    sender: 'all' // 'all', or specific user ID
  });
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  // Search messages
  const searchMessages = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a search query',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        page: '1',
        limit: '50'
      });

      const response = await fetch(`/api/messages/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.messages || []);
        setHasSearched(true);
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('Error searching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to search messages',
        variant: 'destructive'
      });
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search on Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchMessages();
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  // Format message time
  const formatMessageTime = (dateString: string) => {
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

  // Highlight search term in text
  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-medium">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Get message type icon
  const getMessageTypeIcon = (type: Message['message_type']) => {
    switch (type) {
      case 'text':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'image':
        return <div className="h-4 w-4 bg-green-500 rounded" />;
      case 'file':
        return <div className="h-4 w-4 bg-purple-500 rounded" />;
      case 'system':
        return <div className="h-4 w-4 bg-gray-500 rounded" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  // Filter search results
  const filteredResults = searchResults.filter(message => {
    // Apply date filter
    if (filters.dateRange !== 'all') {
      const messageDate = new Date(message.created_at);
      const now = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          if (messageDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (messageDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (messageDate < monthAgo) return false;
          break;
      }
    }
    
    // Apply message type filter
    if (filters.messageType !== 'all' && message.message_type !== filters.messageType) {
      return false;
    }
    
    // Apply sender filter
    if (filters.sender !== 'all' && message.sender_id !== filters.sender) {
      return false;
    }
    
    return true;
  });

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-5 w-5" />
          Message Search
        </CardTitle>
        
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <Button onClick={searchMessages} disabled={loading || !searchQuery.trim()}>
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Filters */}
        {showFilters && (
          <div className="flex gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full mt-1 px-2 py-1 text-sm border rounded"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600">Message Type</label>
              <select
                value={filters.messageType}
                onChange={(e) => setFilters(prev => ({ ...prev, messageType: e.target.value }))}
                className="w-full mt-1 px-2 py-1 text-sm border rounded"
              >
                <option value="all">All Types</option>
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="file">File</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Search className="h-12 w-12 mb-2 text-gray-300" />
              <p className="text-sm">Enter a search query to find messages</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MessageSquare className="h-12 w-12 mb-2 text-gray-300" />
              <p className="text-sm">No messages found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredResults.map((message, index) => (
                <div key={message.id}>
                  <div
                    className="p-4 cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => onMessageSelect?.(message)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getMessageTypeIcon(message.message_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-sm">
                              {message.sender?.first_name} {message.sender?.last_name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {message.message_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {formatMessageTime(message.created_at)}
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-900 mb-2">
                          {highlightSearchTerm(message.content, searchQuery)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {message.property_title && (
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              <span>{message.property_title}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>Conversation ID: {message.conversation_id?.slice(0, 8)}...</span>
                          </div>
                          
                          {message.read_at ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <span>Read</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-blue-600">
                              <span>Unread</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {index < filteredResults.length - 1 && (
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
