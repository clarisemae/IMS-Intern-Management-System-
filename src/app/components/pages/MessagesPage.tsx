import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMessageNotifications } from '@/app/contexts/MessageNotificationsContext';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Send, Search, Paperclip, MoreVertical, Loader2, Star, Bold, Italic, List, FileText, X, Download } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { apiRequest } from '@/lib/api';

interface MessageAttachment {
  name: string;
  type: string;
  data: string;
}

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
  attachment: MessageAttachment | null;
}

interface Conversation {
  id: number;
  name: string;
  role: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
  favorite: boolean;
}

function getPreviewText(content: string) {
  return content
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*-\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderFormattedText(content: string) {
  const lines = content.split('\n');

  return lines.map((line, index) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }

      const token = match[0];

      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={`${index}-${match.index}`}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(<em key={`${index}-${match.index}`}>{token.slice(1, -1)}</em>);
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code key={`${index}-${match.index}`} className="rounded bg-black/10 px-1 py-0.5 text-[0.92em]">
            {token.slice(1, -1)}
          </code>,
        );
      }

      lastIndex = match.index + token.length;
    }

    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    if (line.trim().startsWith('- ')) {
      return (
        <div key={index} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-current/70" />
          <span>{parts.length ? parts : line.slice(2)}</span>
        </div>
      );
    }

    return (
      <p key={index} className="whitespace-pre-wrap">
        {parts.length ? parts : line || '\u00A0'}
      </p>
    );
  });
}

function downloadAttachment(attachment: MessageAttachment) {
  const anchor = document.createElement('a');
  anchor.href = attachment.data;
  anchor.download = attachment.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function isImageAttachment(attachment: MessageAttachment | null) {
  return Boolean(attachment?.type?.startsWith('image/'));
}

async function fileToAttachment(file: File): Promise<MessageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({
          name: file.name,
          type: file.type || 'application/octet-stream',
          data: reader.result,
        });
      } else {
        reject(new Error('Failed to read the selected file.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

function htmlToMarkdown(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === 'br') {
      return '\n';
    }

    if (tag === 'strong' || tag === 'b') {
      return `**${Array.from(element.childNodes).map(walk).join('')}**`;
    }

    if (tag === 'em' || tag === 'i') {
      return `*${Array.from(element.childNodes).map(walk).join('')}*`;
    }

    if (tag === 'ul') {
      return Array.from(element.children)
        .map((child) => `- ${walk(child).trim()}`)
        .join('\n');
    }

    if (tag === 'li') {
      return Array.from(element.childNodes).map(walk).join('').trim();
    }

    if (tag === 'div' || tag === 'p') {
      const content = Array.from(element.childNodes).map(walk).join('');
      return content ? `${content}\n` : '';
    }

    return Array.from(element.childNodes).map(walk).join('');
  };

  return Array.from(container.childNodes)
    .map(walk)
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isComposerEmpty(html: string) {
  return !htmlToMarkdown(html).trim();
}

export function MessagesPage() {
  const { user } = useAuth();
  const { refreshNotifications } = useMessageNotifications();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [selectedConversationInfo, setSelectedConversationInfo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composerHtml, setComposerHtml] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<MessageAttachment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';

    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  };

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const data = await apiRequest<{ conversations: Conversation[] }>('/messages');
      setConversations(data.conversations);
      await refreshNotifications({ silent: true });

      if (!selectedConversation && data.conversations.length > 0) {
        setSelectedConversation(data.conversations[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations.');
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
      setError('');
      await refreshNotifications({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages.');
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      [conversation.name, conversation.role, getPreviewText(conversation.lastMessage)].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [conversations, searchQuery]);

  const applyRichFormat = (command: 'bold' | 'italic' | 'insertUnorderedList') => {
    const editor = composerRef.current;

    if (!editor) {
      return;
    }

    editor.focus();
    document.execCommand(command);
    setComposerHtml(editor.innerHTML);
  };

  const handleSelectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError('Please upload a file smaller than 3 MB.');
      return;
    }

    try {
      const attachment = await fileToAttachment(file);
      setPendingAttachment(attachment);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the selected file.');
    }
  };

  const handleSendMessage = async () => {
    const markdownContent = htmlToMarkdown(composerHtml);

    if ((!markdownContent.trim() && !pendingAttachment) || !selectedConversation) return;

    setIsSending(true);
    setError('');
    try {
      const data = await apiRequest<{ message: Message }>('/messages', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: selectedConversation,
          content: markdownContent,
          attachment: pendingAttachment,
        }),
      });

      setMessages((current) => [...current, data.message]);
      setComposerHtml('');
      if (composerRef.current) {
        composerRef.current.innerHTML = '';
      }
      setPendingAttachment(null);
      await loadConversations();
      await refreshNotifications({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!selectedConv) return;

    setIsTogglingFavorite(true);
    try {
      const response = await apiRequest<{ favorite: boolean }>(`/messages/favorites/${selectedConv.id}`, {
        method: 'PUT',
      });

      setConversations((current) =>
        [...current]
          .map((conversation) =>
            conversation.id === selectedConv.id
              ? { ...conversation, favorite: response.favorite }
              : conversation,
          )
          .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name)),
      );
      setSelectedConversationInfo((current) => (current ? { ...current, favorite: response.favorite } : current));
      await refreshNotifications({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update favorite.');
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleToggleFavoriteForConversation = async (conversation: Conversation) => {
    setIsTogglingFavorite(true);
    setError('');

    try {
      const response = await apiRequest<{ favorite: boolean }>(`/messages/favorites/${conversation.id}`, {
        method: 'PUT',
      });

      setConversations((current) =>
        [...current]
          .map((item) =>
            item.id === conversation.id
              ? { ...item, favorite: response.favorite }
              : item,
          )
          .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name)),
      );

      setSelectedConversationInfo((current) =>
        current && current.id === conversation.id
          ? { ...current, favorite: response.favorite }
          : current,
      );
      await refreshNotifications({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update favorite.');
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedConv = selectedConversationInfo ?? conversations.find((c) => c.id === selectedConversation) ?? null;

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[540px] overflow-hidden rounded-2xl border border-border/60 bg-background">
      <div className="flex min-h-0 w-[340px] flex-col border-r border-gray-200 bg-white">
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

        <ScrollArea className="min-h-0 flex-1">
          <div className="pb-2 pl-2 pr-0 pt-2">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                No conversations found.
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedConversation(conversation.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'mb-2 w-[calc(100%-10px)] rounded-2xl border px-4 py-3 text-left transition-all',
                    selectedConversation === conversation.id
                      ? 'border-primary/30 bg-primary/5 shadow-sm'
                      : 'border-transparent hover:bg-gray-50',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative pt-0.5">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback>{getInitials(conversation.name)}</AvatarFallback>
                      </Avatar>
                      {conversation.online && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <h4 className="truncate text-sm font-semibold leading-5">{conversation.name}</h4>
                            {conversation.favorite && <Star className="h-3.5 w-3.5 flex-shrink-0 fill-amber-400 text-amber-400" />}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">{conversation.role}</p>
                        </div>
                        <div className="flex w-[76px] flex-shrink-0 items-start justify-end gap-1">
                          <span className="truncate pt-1 text-[11px] text-gray-500">{conversation.timestamp}</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleFavoriteForConversation(conversation);
                            }}
                            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-amber-500"
                            aria-label={conversation.favorite ? 'Remove favorite conversation' : 'Favorite conversation'}
                          >
                            <Star className={cn('h-3.5 w-3.5', conversation.favorite && 'fill-amber-400 text-amber-400')} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-5 text-gray-600">
                          {getPreviewText(conversation.lastMessage)}
                        </p>
                        <div className="flex flex-shrink-0 items-center gap-1">
                          {conversation.favorite && conversation.unread > 0 && (
                            <Badge variant="destructive" className="h-5 rounded-full px-1.5 text-[10px]">
                              !
                            </Badge>
                          )}
                          {conversation.unread > 0 && (
                            <Badge className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full p-0 text-xs">
                              {conversation.unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-gray-50">
        {selectedConv ? (
          <>
            <div className="bg-gray-50 p-2.5">
              <div className="mr-5 flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="flex max-w-[calc(100%-4.875rem)] items-center gap-3 rounded-2xl pr-5">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>{getInitials(selectedConv.name)}</AvatarFallback>
                    </Avatar>
                    {selectedConv.online && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium">{selectedConv.name}</h3>
                      {selectedConv.favorite && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                    </div>
                    <p className="truncate text-sm text-gray-600">{selectedConv.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={handleToggleFavorite} disabled={isTogglingFavorite}>
                    <Star className={cn('h-5 w-5', selectedConv.favorite && 'fill-amber-400 text-amber-400')} />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1 p-4">
              <div className={cn('mx-auto max-w-4xl', messages.length === 0 ? 'flex min-h-full flex-col justify-end' : 'space-y-4')}>
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="mb-2 rounded-2xl border border-dashed bg-background px-6 py-12 text-center text-sm text-muted-foreground">
                    No messages yet. Start the conversation with a greeting, update, or shared file.
                  </div>
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
                        <div className={cn('flex flex-col gap-1', isOwnMessage ? 'items-end' : 'items-start')}>
                          <div className={cn('flex items-end gap-2', isOwnMessage ? 'flex-row' : 'flex-col')}>
                            {isOwnMessage && (
                              <p className="text-[11px] text-gray-500">
                                {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            <div
                              className={cn(
                                'max-w-xl rounded-2xl px-4 py-3',
                                isOwnMessage
                                  ? 'rounded-br-sm bg-primary text-primary-foreground'
                                  : 'rounded-bl-sm border border-gray-200 bg-white',
                              )}
                            >
                              {message.content && (
                                <div className="space-y-1 text-sm">
                                  {renderFormattedText(message.content)}
                                </div>
                              )}
                              {message.attachment && (
                                isImageAttachment(message.attachment) ? (
                                  <div className="mt-3">
                                    <div className="relative overflow-hidden rounded-xl">
                                      <button
                                        type="button"
                                        onClick={() => downloadAttachment(message.attachment!)}
                                        className={cn(
                                          'absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors',
                                          isOwnMessage
                                            ? 'border-white/20 bg-slate-950/55 text-white hover:bg-slate-950/75'
                                            : 'border-white/80 bg-white/90 text-slate-700 hover:bg-white',
                                        )}
                                        aria-label={`Download ${message.attachment.name}`}
                                      >
                                        <Download className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => downloadAttachment(message.attachment!)}
                                        className="block overflow-hidden rounded-xl text-left"
                                      >
                                        <img
                                          src={message.attachment.data}
                                          alt={message.attachment.name}
                                          className="max-h-72 w-full rounded-xl object-cover"
                                        />
                                      </button>
                                    </div>
                                    <p className={cn('mt-2 truncate text-xs', isOwnMessage ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
                                      {message.attachment.name}
                                    </p>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => downloadAttachment(message.attachment!)}
                                    className={cn(
                                      'mt-3 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left',
                                      isOwnMessage
                                        ? 'border-white/20 bg-white/10 text-primary-foreground'
                                        : 'border-gray-200 bg-gray-50',
                                    )}
                                  >
                                    <FileText className="h-5 w-5" />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">{message.attachment.name}</p>
                                      <p className={cn('text-xs', isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                        Click to download
                                      </p>
                                    </div>
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                          {!isOwnMessage && (
                            <p className="text-[11px] text-gray-500">
                              {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
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
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-gray-200 bg-white p-4">
              <div className="mx-auto max-w-4xl space-y-3">
                {error && (
                  <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => applyRichFormat('bold')}>
                    <Bold className="mr-2 h-4 w-4" />
                    Bold
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyRichFormat('italic')}>
                    <Italic className="mr-2 h-4 w-4" />
                    Italic
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyRichFormat('insertUnorderedList')}>
                    <List className="mr-2 h-4 w-4" />
                    List
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="mr-2 h-4 w-4" />
                    Attach File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleSelectFile}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
                  />
                </div>

                {pendingAttachment && (
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{pendingAttachment.name}</p>
                        <p className="text-xs text-muted-foreground">Ready to send</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setPendingAttachment(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {isImageAttachment(pendingAttachment) && (
                      <div className="mt-3 overflow-hidden rounded-xl border bg-background">
                        <img
                          src={pendingAttachment.data}
                          alt={pendingAttachment.name}
                          className="max-h-52 w-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="relative flex-1">
                    {isComposerEmpty(composerHtml) && (
                      <span className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground">
                        Type a message...
                      </span>
                    )}
                    <div
                    ref={composerRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => setComposerHtml((e.target as HTMLDivElement).innerHTML)}
                    onKeyDown={handleKeyPress}
                    className="min-h-[88px] rounded-md border border-input bg-input-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
                  />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={(isComposerEmpty(composerHtml) && !pendingAttachment) || isSending}
                    className="h-11 flex-shrink-0"
                  >
                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send
                  </Button>
                </div>
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
