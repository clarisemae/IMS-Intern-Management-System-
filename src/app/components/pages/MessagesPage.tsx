import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Send, Search, Paperclip, MoreVertical, Loader2 } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { apiRequest } from '@/lib/api';

interface Message {
  id: number;
  senderId: number;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [selectedConversationInfo, setSelectedConversationInfo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const data = await apiRequest<{ conversations: Conversation[] }>('/messages');
      setConversations(data.conversations);

      if (!selectedConversation && data.conversations.length > 0) {
        setSelectedConversation(data.conversations[0].id);
      }
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    setIsLoadingMessages(true);
    try {
      const data = await apiRequest<{ conversation: Conversation; messages: Message[] }>(`/messages/${conversationId}`);
      setSelectedConversationInfo(data.conversation);
      setMessages(data.messages);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      [conversation.name, conversation.role, conversation.lastMessage].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [conversations, searchQuery]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    setIsSending(true);
    try {
      const data = await apiRequest<{ message: Message }>('/messages', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: selectedConversation,
          content: messageText,
        }),
      });

      setMessages((current) => [...current, data.message]);
      setMessageText('');
      await loadConversations();
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedConv = selectedConversationInfo ?? conversations.find((c) => c.id === selectedConversation) ?? null;

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      <div className="flex w-80 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No conversations found.</div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={cn(
                    'mb-1 w-full rounded-lg p-3 text-left transition-colors',
                    selectedConversation === conversation.id
                      ? 'border border-purple-200 bg-purple-50'
                      : 'hover:bg-gray-50',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback>{getInitials(conversation.name)}</AvatarFallback>
                      </Avatar>
                      {conversation.online && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <h4 className="truncate text-sm font-medium">{conversation.name}</h4>
                        <span className="ml-2 flex-shrink-0 text-xs text-gray-500">{conversation.timestamp}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm text-gray-600">{conversation.lastMessage}</p>
                        {conversation.unread > 0 && (
                          <Badge className="ml-2 flex h-5 w-5 flex-shrink-0 items-center justify-center p-0 text-xs">
                            {conversation.unread}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{conversation.role}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex flex-1 flex-col bg-gray-50">
        {selectedConv ? (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar>
                    <AvatarFallback>{getInitials(selectedConv.name)}</AvatarFallback>
                  </Avatar>
                  {selectedConv.online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{selectedConv.name}</h3>
                  <p className="text-sm text-gray-600">{selectedConv.role}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="mx-auto max-w-4xl space-y-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">No messages yet. Start the conversation.</div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.senderId === user?.id;

                    return (
                      <div
                        key={message.id}
                        className={cn('flex gap-2', isOwnMessage ? 'justify-end' : 'justify-start')}
                      >
                        {!isOwnMessage && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(message.senderName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            'max-w-md rounded-2xl px-4 py-2',
                            isOwnMessage
                              ? 'rounded-br-sm bg-purple-600 text-white'
                              : 'rounded-bl-sm border border-gray-200 bg-white',
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={cn('mt-1 text-xs', isOwnMessage ? 'text-purple-100' : 'text-gray-500')}>
                            {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {isOwnMessage && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(message.senderName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <div className="border-t border-gray-200 bg-white p-4">
              <div className="mx-auto flex max-w-4xl items-end gap-2">
                <Button variant="ghost" size="icon" className="flex-shrink-0" disabled>
                  <Paperclip className="h-5 w-5" />
                </Button>
                <div className="relative flex-1">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="pr-12"
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || isSending}
                  className="flex-shrink-0"
                >
                  {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
