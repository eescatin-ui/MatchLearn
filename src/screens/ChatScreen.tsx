import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '../components/AppAlert';
import { Ionicons } from '@expo/vector-icons';
import UserRatingBadge from '../components/UserRatingBadge';
import AppHeader from '../components/AppHeader';
import {
  ConversationRecord,
  deleteMessage,
  fetchConversationMessages,
  MessageRecord,
  sendMessage,
  updateMessage,
} from '../services/api/messages';
import { colors } from '../theme';

interface MessageTextPart {
  text: string;
  url?: string;
}

const splitMessageLinks = (content: string): MessageTextPart[] => {
  const parts: MessageTextPart[] = [];
  const linkPattern = /https?:\/\/[^\s<>"']+/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(content)) !== null) {
    let url = match[0];
    let trailingText = '';

    while (/[.,!?;:]$/.test(url)) {
      trailingText = url.slice(-1) + trailingText;
      url = url.slice(0, -1);
    }

    for (const [opening, closing] of [['(', ')'], ['[', ']'], ['{', '}']]) {
      while (url.endsWith(closing)) {
        const openingCount = [...url].filter((character) => character === opening).length;
        const closingCount = [...url].filter((character) => character === closing).length;
        if (closingCount <= openingCount) break;

        trailingText = url.slice(-1) + trailingText;
        url = url.slice(0, -1);
      }
    }

    if (!/^https?:\/\/[a-z\d.-]+(?::\d+)?(?:[/?#][^\s]*)?$/i.test(url)) {
      continue;
    }

    if (match.index > lastIndex) {
      parts.push({ text: content.slice(lastIndex, match.index) });
    }
    parts.push({ text: url, url });
    if (trailingText) parts.push({ text: trailingText });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ text: content }];
};

function MessageGesture({
  children,
  onSwipeReply,
}: {
  children: ReactNode;
  onSwipeReply: () => void;
}) {
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => (
      Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4
    ),
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 54) onSwipeReply();
    },
  }), [onSwipeReply]);

  return <View {...panResponder.panHandlers}>{children}</View>;
}

export default function ChatScreen({ navigation, route }: any) {
  const { chat } = route.params;
  const conversation = chat as ConversationRecord;
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<MessageRecord | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageRecord | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const pendingMessage = useRef<{ content: string; clientMessageId: string } | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const nextMessages = await fetchConversationMessages(conversation);
      setError(null);
      setMessages(nextMessages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load messages.');
    } finally {
      setLoading(false);
    }
  }, [conversation]);

  useEffect(() => {
    void Promise.resolve().then(loadMessages);
  }, [loadMessages]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;

    if (editingMessage) {
      try {
        setSending(true);
        setSendError(null);
        await updateMessage(editingMessage.id, content);
        setMessages((current) => current.map((message) => (
          message.id === editingMessage.id
            ? { ...message, content, edited_at: new Date().toISOString() }
            : message
        )));
        await loadMessages();
        setEditingMessage(null);
        setDraft('');
      } catch (updateError) {
        setSendError(updateError instanceof Error ? updateError.message : 'Please try again.');
      } finally {
        setSending(false);
      }
      return;
    }

    if (!pendingMessage.current || pendingMessage.current.content !== content) {
      pendingMessage.current = {
        content,
        clientMessageId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      };
    }

    try {
      setSending(true);
      setSendError(null);
      await sendMessage(conversation, content, pendingMessage.current.clientMessageId, replyTarget?.id);
      pendingMessage.current = null;
      setDraft('');
      setReplyTarget(null);
      await loadMessages();
    } catch (sendError) {
      setSendError(sendError instanceof Error ? sendError.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleDraftChange = (nextDraft: string) => {
    setDraft(nextDraft);
    if (pendingMessage.current?.content !== nextDraft.trim()) {
      pendingMessage.current = null;
      setSendError(null);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (openError) {
      Alert.alert(
        'Could not open link',
        openError instanceof Error ? openError.message : 'Please try again.'
      );
    }
  };

  const startReply = (message: MessageRecord) => {
    pendingMessage.current = null;
    setReplyTarget(message);
    setEditingMessage(null);
    setSelectedMessageId(null);
    setSendError(null);
  };

  const startEdit = (message: MessageRecord) => {
    pendingMessage.current = null;
    setEditingMessage(message);
    setReplyTarget(null);
    setDraft(message.content);
    setSelectedMessageId(null);
    setSendError(null);
  };

  const removeMessage = (message: MessageRecord) => {
    Alert.alert('Delete message?', 'This will remove your message from the conversation.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteMessage(message.id);
              await loadMessages();
              setSelectedMessageId(null);
              setReplyTarget((current) => current?.id === message.id ? null : current);
            } catch (deleteError) {
              Alert.alert(
                'Could not delete message',
                deleteError instanceof Error ? deleteError.message : 'Please try again.'
              );
            }
          })();
        },
      },
    ]);
  };

  const lastIncomingMessageIndex = conversation.type === 'direct'
    ? messages.reduce((lastIndex, message, index) => (
      message.sender === 'them' ? index : lastIndex
    ), -1)
    : -1;

  return (
    <KeyboardAvoidingView
      style={styles.frame}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AppHeader title={chat.name} navigation={navigation} showBackButton />

      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.notice}>{error}</Text>
          <TouchableOpacity onPress={() => { setLoading(true); void loadMessages(); }}>
            <Text style={styles.retry}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.messagesWrap}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? <Text style={styles.notice}>No messages yet. Start the conversation.</Text> : null}
          {messages.map((message, index) => (
            <MessageGesture
              key={`${conversation.type}:${conversation.type === 'group' ? conversation.group_id ?? conversation.id : conversation.direct_conversation_id ?? conversation.id}:${message.id}`}
              onSwipeReply={() => startReply(message)}
            >
              <View
                style={[styles.messageRow, message.sender === 'me' ? styles.messageRowMine : styles.messageRowThem]}
              >
                {message.sender === 'them' ? (
                  message.user?.profile_photo_url || conversation.profile_photo_url ? (
                    <View style={styles.messageAvatarWrap}>
                      <Image
                        source={{ uri: message.user?.profile_photo_url ?? conversation.profile_photo_url ?? undefined }}
                        style={styles.messageAvatar}
                      />
                      <UserRatingBadge
                        averageRating={message.user?.average_rating ?? conversation.average_rating}
                        ratingsCount={message.user?.ratings_count ?? conversation.ratings_count}
                      />
                    </View>
                  ) : (
                    <View style={styles.messageAvatarWrap}>
                      <View style={[styles.messageAvatar, styles.messageAvatarFallback]}>
                        <Text style={styles.messageAvatarText}>
                          {(message.user?.name ?? conversation.name).slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <UserRatingBadge
                        averageRating={message.user?.average_rating ?? conversation.average_rating}
                        ratingsCount={message.user?.ratings_count ?? conversation.ratings_count}
                      />
                    </View>
                  )
                ) : (
                  null
                )}
                <View style={styles.messageContentWrap}>
                  <Pressable
                    onLongPress={() => setSelectedMessageId((current) => current === message.id ? null : message.id)}
                    delayLongPress={350}
                    accessibilityRole="button"
                    accessibilityLabel={`${message.sender === 'me' ? 'Your' : `${message.user?.name ?? 'Their'}`} message. Long press for actions, swipe to reply.`}
                  >
                    <View style={[styles.messageBubble, message.sender === 'me' ? styles.messageMine : styles.messageThem]}>
                      <Text style={[styles.senderName, message.sender === 'me' && styles.senderNameMine]}>
                        {message.sender === 'me' ? 'You' : message.user?.name || (conversation.type === 'direct' ? conversation.name : 'Group member')}
                      </Text>
                      {message.reply_to ? (
                        <View style={[styles.replyPreview, message.sender === 'me' && styles.replyPreviewMine]}>
                          <Text style={[styles.replyPreviewName, message.sender === 'me' && styles.replyPreviewNameMine]} numberOfLines={1}>
                            {message.reply_to.user_name}
                          </Text>
                          <Text style={[styles.replyPreviewText, message.sender === 'me' && styles.replyPreviewTextMine]} numberOfLines={2}>
                            {message.reply_to.content}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={[styles.messageText, message.sender === 'me' && styles.messageTextMine]}>
                        {splitMessageLinks(message.content).map((part, partIndex) => {
                          if (!part.url) {
                            return <Text key={`text:${partIndex}`}>{part.text}</Text>;
                          }

                          const url = part.url;
                          return (
                            <Text
                              key={`${url}:${partIndex}`}
                              accessibilityRole="link"
                              accessibilityHint="Opens this website in your browser"
                              onPress={() => { void handleOpenLink(url); }}
                              style={[styles.messageLink, message.sender === 'me' && styles.messageLinkMine]}
                            >
                              {part.text}
                            </Text>
                          );
                        })}
                      </Text>
                    </View>
                  </Pressable>
                  {message.edited_at ? <Text style={styles.editedLabel}>Edited</Text> : null}
                  {selectedMessageId === message.id ? (
                    <View style={[styles.messageActions, message.sender === 'me' && styles.messageActionsMine]}>
                      <Pressable style={styles.messageActionButton} onPress={() => startReply(message)}>
                        <Ionicons name="return-up-back-outline" size={15} color={colors.teal} />
                        <Text style={styles.messageActionText}>Reply</Text>
                      </Pressable>
                      {message.sender === 'me' ? (
                        <>
                          <Pressable style={styles.messageActionButton} onPress={() => startEdit(message)}>
                            <Ionicons name="create-outline" size={15} color={colors.teal} />
                            <Text style={styles.messageActionText}>Edit</Text>
                          </Pressable>
                          <Pressable style={styles.messageActionButton} onPress={() => removeMessage(message)}>
                            <Ionicons name="trash-outline" size={15} color="#b91c1c" />
                            <Text style={styles.messageActionDeleteText}>Delete</Text>
                          </Pressable>
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>
              {index === lastIncomingMessageIndex ? (
                <Text style={styles.seenReceipt}>Seen</Text>
              ) : null}
            </MessageGesture>
          ))}
        </ScrollView>
      )}

      {editingMessage || replyTarget ? (
        <View style={styles.composerContext}>
          <View style={styles.composerContextCopy}>
            <Text style={styles.composerContextTitle}>
              {editingMessage ? 'Editing message' : `Replying to ${replyTarget?.sender === 'me' ? 'yourself' : replyTarget?.user?.name ?? 'message'}`}
            </Text>
            {!editingMessage ? <Text style={styles.composerContextText} numberOfLines={1}>{replyTarget?.content}</Text> : null}
          </View>
          <TouchableOpacity
            onPress={() => {
              if (editingMessage) setDraft('');
              setEditingMessage(null);
              setReplyTarget(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Cancel message action"
          >
            <Ionicons name="close-circle" size={22} color="#64748b" />
          </TouchableOpacity>
        </View>
      ) : null}
      {sendError ? (
        <View style={styles.sendErrorRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle-outline" size={16} color="#b42318" />
          <Text style={styles.sendErrorText} numberOfLines={2}>
            Message not sent. Your draft is saved. {sendError}
          </Text>
        </View>
      ) : null}
      <View style={styles.inputBar}>
        <TextInput
          value={draft}
          onChangeText={handleDraftChange}
          placeholder={editingMessage ? 'Edit your message...' : 'Type a message...'}
          style={styles.input}
          multiline
          editable={!sending}
          maxLength={2000}
        />
        <TouchableOpacity style={[styles.sendButton, sending && styles.disabled]} onPress={() => { void handleSend(); }} disabled={sending}>
          <Text style={styles.sendButtonText}>
            {sending ? editingMessage ? 'Saving' : 'Sending' : editingMessage ? 'Save' : sendError ? 'Retry' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: colors.page },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  notice: { color: '#64748b', textAlign: 'center', padding: 16 },
  retry: { color: colors.teal, fontWeight: '700' },
  messagesWrap: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
  messagesContent: { paddingBottom: 18, flexGrow: 1, justifyContent: 'flex-end' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 },
  messageRowMine: { justifyContent: 'flex-end' },
  messageRowThem: { justifyContent: 'flex-start' },
  messageAvatarWrap: { width: 30, height: 30, position: 'relative', marginRight: 6 },
  messageAvatar: { width: 30, height: 30, borderRadius: 11 },
  messageAvatarFallback: { backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  messageAvatarText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  messageBubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  messageContentWrap: { maxWidth: '84%' },
  messageMine: { backgroundColor: colors.teal },
  messageThem: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  messageTextMine: { color: '#fff' },
  replyPreview: { backgroundColor: '#eef2f6', borderLeftWidth: 3, borderLeftColor: colors.teal, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 7 },
  replyPreviewMine: { backgroundColor: '#0f5268', borderLeftColor: '#bfdbfe' },
  replyPreviewName: { color: colors.teal, fontSize: 10, fontWeight: '800' },
  replyPreviewNameMine: { color: '#bfdbfe' },
  replyPreviewText: { color: '#475569', fontSize: 11, marginTop: 2 },
  replyPreviewTextMine: { color: '#e0f2fe' },
  messageLink: { color: colors.teal, textDecorationLine: 'underline' },
  messageLinkMine: { color: '#bfdbfe' },
  seenReceipt: { color: colors.muted, fontSize: 10, fontWeight: '600', textAlign: 'left', marginLeft: 38, marginTop: -6, marginBottom: 8 },
  senderName: { color: '#64748b', fontSize: 11, fontWeight: '700', marginBottom: 3 },
  senderNameMine: { color: '#dbeafe' },
  editedLabel: { color: colors.muted, fontSize: 9, marginTop: -7, marginBottom: 7, textAlign: 'right' },
  messageActions: { flexDirection: 'row', alignSelf: 'flex-start', gap: 4, marginTop: -4, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 9, padding: 4, borderWidth: 1, borderColor: colors.border },
  messageActionsMine: { alignSelf: 'flex-end' },
  messageActionButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 6 },
  messageActionText: { color: colors.teal, fontSize: 11, fontWeight: '700' },
  messageActionDeleteText: { color: '#b91c1c', fontSize: 11, fontWeight: '700' },
  composerContext: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#f0f7fa', borderTopWidth: 1, borderTopColor: colors.border },
  composerContextCopy: { flex: 1, gap: 2 },
  composerContextTitle: { color: colors.teal, fontSize: 11, fontWeight: '800' },
  composerContextText: { color: colors.muted, fontSize: 11 },
  inputBar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.page, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  sendButton: { backgroundColor: colors.teal, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  sendButtonText: { color: '#fff', fontWeight: '800' },
  sendErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: '#fff7f7' },
  sendErrorText: { flex: 1, color: '#b42318', fontSize: 11, lineHeight: 15 },
  disabled: { opacity: 0.6 },
});
