import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Search } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
}

const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    lastMessage: 'Is the apartment still available?',
    timestamp: '2 min ago',
    unread: 2,
    online: true
  },
  {
    id: '2',
    name: 'Mike Properties',
    lastMessage: 'The maintenance team will arrive tomorrow',
    timestamp: '1 hour ago',
    unread: 0,
    online: false
  },
  {
    id: '3',
    name: 'Emma Wilson',
    lastMessage: 'Thank you for the quick response!',
    timestamp: '3 hours ago',
    unread: 0,
    online: false
  }
];

const mockMessages = [
  {
    id: '1',
    senderId: '2',
    content: 'Hi! I wanted to discuss the maintenance request you submitted.',
    timestamp: '10:30 AM',
    isSent: false
  },
  {
    id: '2',
    senderId: '1',
    content: 'Yes, the kitchen faucet is still leaking. When can someone come to fix it?',
    timestamp: '10:32 AM',
    isSent: true
  },
  {
    id: '3',
    senderId: '2',
    content: 'The maintenance team will arrive tomorrow between 2-4 PM. Will you be available?',
    timestamp: '10:35 AM',
    isSent: false
  },
  {
    id: '4',
    senderId: '1',
    content: 'Perfect! I\'ll make sure to be home during that time.',
    timestamp: '10:36 AM',
    isSent: true
  }
];

export default function Messages() {
  const [selectedContact, setSelectedContact] = useState<Contact>(mockContacts[1]);
  const [messageInput, setMessageInput] = useState('');

  return (
    <div className="h-[calc(100vh-4rem)] py-8 pb-20 md:pb-8">
      <div className="container mx-auto px-4 h-full">
        <Card className="h-full overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] h-full">
            {/* Contacts Sidebar */}
            <div className="border-r">
              <div className="p-4 border-b">
                <h2 className="text-2xl font-bold mb-4">Messages</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search messages..." className="pl-10" />
                </div>
              </div>

              <ScrollArea className="h-[calc(100%-120px)]">
                {mockContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors ${
                      selectedContact.id === contact.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback>
                          {contact.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {contact.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold truncate">{contact.name}</span>
                        <span className="text-xs text-muted-foreground">{contact.timestamp}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
                        {contact.unread > 0 && (
                          <Badge className="ml-2 rounded-full h-5 w-5 p-0 flex items-center justify-center">
                            {contact.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex flex-col h-full">
              {/* Chat Header */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>
                        {selectedContact.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {selectedContact.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedContact.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedContact.online ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {mockMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isSent ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.isSent
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span className={`text-xs mt-1 block ${
                          message.isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {message.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (messageInput.trim()) {
                      console.log('Sending:', messageInput);
                      setMessageInput('');
                    }
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
