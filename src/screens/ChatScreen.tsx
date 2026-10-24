import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '../components/AppAlert';
import UserRatingBadge from '../components/UserRatingBadge';
import { ConversationRecord, fetchConversationMessages, MessageRecord, sendMessage } from '../services/api/messages';
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

export default function ChatScreen({ navigation, route }: any) {
  const { chat } = route.params;
  const conversation = chat as ConversationRecord;
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    try {
      setSending(true);
      await sendMessage(conversation, content);
      setDraft('');
      await loadMessages();
    } catch (sendError) {
      Alert.alert('Message not sent', sendError instanceof Error ? sendError.message : 'Please try again.');
    } finally {
      setSending(false);
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{chat.name}</Text>
      </View>

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
            <View
              key={`${conversation.type}:${conversation.type === 'group' ? conversation.group_id ?? conversation.id : conversation.direct_conversation_id ?? conversation.id}:${message.id}`}
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
                <View style={[styles.messageBubble, message.sender === 'me' ? styles.messageMine : styles.messageThem]}>
                  <Text style={[styles.senderName, message.sender === 'me' && styles.senderNameMine]}>
                    {message.sender === 'me' ? 'You' : message.user?.name || (conversation.type === 'direct' ? conversation.name : 'Group member')}
                  </Text>
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
              </View>
              {index === lastIncomingMessageIndex ? (
                <Text style={styles.seenReceipt}>Seen</Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.inputBar}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message..."
          style={styles.input}
          multiline
          editable={!sending}
          maxLength={2000}
        />
        <TouchableOpacity style={[styles.sendButton, sending && styles.disabled]} onPress={() => { void handleSend(); }} disabled={sending}>
          <Text style={styles.sendButtonText}>{sending ? 'Sending' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: colors.page },
  header: { minHeight: 60, paddingHorizontal: 18, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 16 },
  back: { color: colors.teal, fontSize: 32 },
  headerTitle: { color: colors.navy, fontSize: 20, fontWeight: '700' },
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
  messageMine: { backgroundColor: colors.teal },
  messageThem: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  messageTextMine: { color: '#fff' },
  messageLink: { color: colors.teal, textDecorationLine: 'underline' },
  messageLinkMine: { color: '#bfdbfe' },
  seenReceipt: { color: colors.muted, fontSize: 10, fontWeight: '600', textAlign: 'left', marginLeft: 38, marginTop: -6, marginBottom: 8 },
  senderName: { color: '#64748b', fontSize: 11, fontWeight: '700', marginBottom: 3 },
  senderNameMine: { color: '#dbeafe' },
  inputBar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.page, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  sendButton: { backgroundColor: colors.teal, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  sendButtonText: { color: '#fff', fontWeight: '800' },
  disabled: { opacity: 0.6 },
});
