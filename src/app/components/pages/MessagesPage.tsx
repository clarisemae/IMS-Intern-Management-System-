import React, { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Send, Search, Paperclip, MoreVertical } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface Message {
  id: number;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface Conversation {
  id: number;
  name: string;
  role: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
}

export function MessagesPage() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<number>(1);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock conversations
  const conversations: Conversation[] = [
    {
      id: 1,
      name: 'Jane Supervisor',
      role: 'Supervisor',
      lastMessage: 'Great work on the project documentation!',
      timestamp: '10:30 AM',
      unread: 2,
      online: true,
    },
    {
      id: 2,
      name: 'Sarah Lee',
      role: 'Intern',
      lastMessage: 'Can you help me with the database query?',
      timestamp: '9:45 AM',
      unread: 0,
      online: true,
    },
    {
      id: 3,
      name: 'Mike Johnson',
      role: 'Intern',
      lastMessage: 'Thanks for the feedback!',
      timestamp: 'Yesterday',
      unread: 0,
      online: false,
    },
    {
      id: 4,
      name: 'Admin User',
      role: 'Admin',
      lastMessage: 'Please submit your weekly report.',
      timestamp: 'Yesterday',
      unread: 1,
      online: true,
    },
    {
      id: 5,
      name: 'Emma Davis',
      role: 'Intern',
      lastMessage: 'See you at the team meeting!',
      timestamp: '2 days ago',
      unread: 0,
      online: false,
    },
  ];

  // Mock messages for selected conversation
  const messages: Message[] = [
    {
      id: 1,
      senderId: '2',
      senderName: 'Jane Supervisor',
      content: 'Hi! How is your project coming along?',
      timestamp: '10:15 AM',
      read: true,
    },
    {
      id: 2,
      senderId: user?.id || '1',
      senderName: user?.name || 'You',
      content: 'It\'s going well! I\'ve completed most of the documentation.',
      timestamp: '10:18 AM',
      read: true,
    },
    {
      id: 3,
      senderId: '2',
      senderName: 'Jane Supervisor',
      content: 'That\'s excellent! Make sure to include the API documentation as well.',
      timestamp: '10:20 AM',
      read: true,
    },
    {
      id: 4,
      senderId: user?.id || '1',
      senderName: user?.name || 'You',
      content: 'Will do! I\'ll have it ready by end of day.',
      timestamp: '10:22 AM',
      read: true,
    },
    {
      id: 5,
      senderId: '2',
      senderName: 'Jane Supervisor',
      content: 'Great work on the project documentation!',
      timestamp: '10:30 AM',
      read: false,
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // In a real app, this would send the message to the backend
      console.log('Sending message:', messageText);
      setMessageText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="h-[calc(100vh-3rem)] flex">
      {/* Conversations List */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-colors mb-1",
                  selectedConversation === conversation.id
                    ? "bg-purple-50 border border-purple-200"
                    : "hover:bg-gray-50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>{getInitials(conversation.name)}</AvatarFallback>
                    </Avatar>
                    {conversation.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm truncate">{conversation.name}</h4>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{conversation.timestamp}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                      {conversation.unread > 0 && (
                        <Badge className="ml-2 flex-shrink-0 h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {conversation.unread}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{conversation.role}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar>
                    <AvatarFallback>{getInitials(selectedConv.name)}</AvatarFallback>
                  </Avatar>
                  {selectedConv.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{selectedConv.name}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedConv.online ? 'Active now' : 'Offline'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((message) => {
                  const isOwnMessage = message.senderId === user?.id;
                  
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-2",
                        isOwnMessage ? "justify-end" : "justify-start"
                      )}
                    >
                      {!isOwnMessage && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(message.senderName)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-md px-4 py-2 rounded-2xl",
                          isOwnMessage
                            ? "bg-purple-600 text-white rounded-br-sm"
                            : "bg-white border border-gray-200 rounded-bl-sm"
                        )}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={cn(
                            "text-xs mt-1",
                            isOwnMessage ? "text-purple-100" : "text-gray-500"
                          )}
                        >
                          {message.timestamp}
                        </p>
                      </div>
                      {isOwnMessage && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(message.senderName)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="max-w-4xl mx-auto flex items-end gap-2">
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <Paperclip className="w-5 h-5" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pr-12"
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="flex-shrink-0"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}