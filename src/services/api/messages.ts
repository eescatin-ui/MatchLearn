import { apiClient } from './client';
import { ApiResponse } from '../../types/auth';
import { GroupAvatarColor, GroupAvatarIcon } from './groups';

export interface ConversationRecord {
  id: number;
  type: 'group' | 'direct';
  name: string;
  initials: string;
  avatar_icon?: GroupAvatarIcon;
  avatar_color?: GroupAvatarColor;
  profile_photo_url?: string | null;
  average_rating?: number | null;
  ratings_count?: number;
  lastMessage: string;
  time: string | null;
  unread_count?: number;
  group_id?: number;
  direct_conversation_id?: number;
}

interface MessageListResponse extends ApiResponse {
  data?: {
    conversations?: ConversationRecord[];
    messages?: MessageRecord[];
    unread_count?: number;
  };
}

export interface ConversationsFeed {
  conversations: ConversationRecord[];
  unreadCount: number;
}

export const fetchConversations = async (): Promise<ConversationsFeed> => {
  const response = await apiClient.get<MessageListResponse>('/messages');
  return {
    conversations: response.data?.data?.conversations ?? [],
    unreadCount: response.data?.data?.unread_count ?? 0,
  };
};

export interface MessageRecord {
  id: number;
  user_id: number;
  sender: 'me' | 'them';
  content: string;
  created_at: string;
  edited_at?: string | null;
  reply_to?: {
    id: number;
    user_name: string;
    content: string;
  } | null;
  user: {
    id: number;
    name: string;
    profile_photo_url?: string | null;
    average_rating?: number | null;
    ratings_count?: number;
  } | null;
}

export const fetchConversationMessages = async (chat: ConversationRecord): Promise<MessageRecord[]> => {
  const path = chat.type === 'group'
    ? `/messages/${chat.group_id ?? chat.id}`
    : `/messages/direct-conversations/${chat.direct_conversation_id ?? chat.id}`;
  const response = await apiClient.get<MessageListResponse>(path);
  return response.data?.data?.messages ?? [];
};

export const sendMessage = async (
  chat: ConversationRecord,
  content: string,
  clientMessageId: string,
  replyToId?: number
): Promise<void> => {
  if (chat.type === 'group') {
    await apiClient.post('/messages', {
      group_id: chat.group_id ?? chat.id,
      content,
      client_message_id: clientMessageId,
      reply_to_id: replyToId,
    });
    return;
  }
  await apiClient.post(`/messages/direct-conversations/${chat.direct_conversation_id ?? chat.id}`, {
    content,
    client_message_id: clientMessageId,
    reply_to_id: replyToId,
  });
};

export const updateMessage = async (messageId: number, content: string): Promise<void> => {
  await apiClient.patch(`/messages/${messageId}`, { content });
};

export const deleteMessage = async (messageId: number): Promise<void> => {
  await apiClient.delete(`/messages/${messageId}`);
};

export const startDirectConversation = async (matchedUserId: number): Promise<ConversationRecord> => {
  const response = await apiClient.post<{ data?: { conversation?: ConversationRecord } }>(
    '/messages/direct-conversations',
    { matched_user_id: matchedUserId }
  );
  const conversation = response.data?.data?.conversation;
  if (!conversation) throw new Error('The server did not return the conversation.');
  return conversation;
};
