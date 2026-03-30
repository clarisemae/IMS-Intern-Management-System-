import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api';

interface NotificationConversation {
  id: number;
  name: string;
  lastMessage: string;
  unread: number;
  favorite: boolean;
}

interface MessageNotificationsContextValue {
  unreadCount: number;
  hasImportantUnread: boolean;
  refreshNotifications: (options?: { silent?: boolean }) => Promise<void>;
}

const MessageNotificationsContext = createContext<MessageNotificationsContextValue | undefined>(undefined);

function getPreviewText(content: string) {
  return content
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*-\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function MessageNotificationsProvider({
  children,
  currentPage,
  isAuthenticated,
}: {
  children: ReactNode;
  currentPage: string;
  isAuthenticated: boolean;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasImportantUnread, setHasImportantUnread] = useState(false);
  const previousUnreadRef = useRef<Record<number, number>>({});
  const initializedRef = useRef(false);

  const refreshNotifications = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!isAuthenticated) {
        setUnreadCount(0);
        setHasImportantUnread(false);
        previousUnreadRef.current = {};
        initializedRef.current = false;
        return;
      }

      const data = await apiRequest<{ conversations: NotificationConversation[] }>('/messages');
      const conversations = data.conversations;
      const nextUnreadMap = Object.fromEntries(conversations.map((conversation) => [conversation.id, conversation.unread]));
      const totalUnread = conversations.reduce((sum, conversation) => sum + conversation.unread, 0);
      const importantUnread = conversations.some((conversation) => conversation.favorite && conversation.unread > 0);

      setUnreadCount(totalUnread);
      setHasImportantUnread(importantUnread);

      const shouldNotify = initializedRef.current && !options?.silent && currentPage !== 'messages';

      if (shouldNotify) {
        conversations.forEach((conversation) => {
          const previousUnread = previousUnreadRef.current[conversation.id] ?? 0;
          if (conversation.unread > previousUnread) {
            toast(conversation.favorite ? 'Important message received' : 'New message received', {
              description: `${conversation.name}: ${getPreviewText(conversation.lastMessage) || 'Sent you a new message.'}`,
            });
          }
        });
      }

      previousUnreadRef.current = nextUnreadMap;
      initializedRef.current = true;
    },
    [currentPage, isAuthenticated],
  );

  useEffect(() => {
    refreshNotifications({ silent: true });
  }, [refreshNotifications]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const interval = window.setInterval(() => {
      refreshNotifications().catch(() => {
        // Keep polling resilient without interrupting the user.
      });
    }, 15000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, refreshNotifications]);

  const value = useMemo(
    () => ({
      unreadCount,
      hasImportantUnread,
      refreshNotifications,
    }),
    [hasImportantUnread, refreshNotifications, unreadCount],
  );

  return <MessageNotificationsContext.Provider value={value}>{children}</MessageNotificationsContext.Provider>;
}

export function useMessageNotifications() {
  const context = useContext(MessageNotificationsContext);

  if (!context) {
    throw new Error('useMessageNotifications must be used within a MessageNotificationsProvider');
  }

  return context;
}
