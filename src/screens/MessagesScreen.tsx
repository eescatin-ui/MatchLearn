import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ConversationRecord, fetchConversations } from '../services/api/messages';
import AppHeader from '../components/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import GroupAvatar from '../components/GroupAvatar';
import { colors } from '../theme';

export default function MessagesScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [chats, setChats] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      setError(null);
      const feed = await fetchConversations();
      setChats(feed.conversations);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load conversations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadConversations();
  }, [loadConversations]));

  const filteredChats = useMemo(() => {
    return chats.filter((chat) =>
      chat.name.toLowerCase().includes(query.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(query.toLowerCase())
    );
  }, [chats, query]);

  const openConversation = (chat: ConversationRecord) => {
    setChats((current) => current.map((item) => (
      item.type === chat.type
        && (item.type === 'group'
          ? item.group_id ?? item.id
          : item.direct_conversation_id ?? item.id)
          === (chat.type === 'group'
            ? chat.group_id ?? chat.id
            : chat.direct_conversation_id ?? chat.id)
        ? { ...item, unread_count: 0 }
        : item
    )));
    navigation.navigate('Chat', { chat });
  };

  return (
    <View style={styles.frame}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <AppHeader title="Messages" subtitle="Stay connected" navigation={navigation} />

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}><Ionicons name="chatbubbles-outline" size={22} color={colors.teal} /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>YOUR STUDY CONVERSATIONS</Text>
            <Text style={styles.heroTitle}>Keep the ideas flowing.</Text>
            <Text style={styles.heroSubtitle}>Pick up where you left off with your buddies and groups.</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search chats..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.chatList}>
          {loading ? <Text style={styles.emptyText}>Loading conversations…</Text> : error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity onPress={() => { setLoading(true); void loadConversations(); }}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : filteredChats.length === 0 ? (
            <Text style={styles.emptyText}>{query ? 'No conversations match your search.' : 'No conversations yet. Join a study group to start chatting.'}</Text>
          ) : (
            <View style={styles.chatTable}>
              {filteredChats.map((chat, index) => {
                const previewSeparator = chat.lastMessage.indexOf(': ');
                const hasUnread = (chat.unread_count ?? 0) > 0;

                return (
                <TouchableOpacity
                  key={`${chat.type}:${chat.type === 'group' ? chat.group_id ?? chat.id : chat.direct_conversation_id ?? chat.id}`}
                  style={[styles.chatItem, index === filteredChats.length - 1 && styles.chatItemLast]}
                  onPress={() => openConversation(chat)}
                >
                  {chat.type === 'direct' && chat.profile_photo_url ? (
                    <Image source={{ uri: chat.profile_photo_url }} style={styles.avatarCircle} />
                  ) : chat.type === 'group' ? (
                    <GroupAvatar icon={chat.avatar_icon} color={chat.avatar_color} size={48} style={styles.avatarCircle} />
                  ) : (
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarTextSmall}>{chat.initials}</Text>
                    </View>
                  )}

                  <View style={styles.chatInfo}>
                    <View style={styles.chatMetaRow}>
                      <Text style={styles.chatName}>{chat.name}</Text>
                      <Text style={styles.chatTime}>{chat.time}</Text>
                    </View>

                    <View style={styles.previewRow}>
                      <View style={[styles.typeBadge, chat.type === 'group' ? styles.groupBadge : styles.buddyBadge]}>
                        <Text style={styles.typeBadgeText}>{chat.type === 'group' ? 'Group' : 'Buddy'}</Text>
                      </View>
                      <Text style={styles.chatPreview} numberOfLines={1}>
                        {previewSeparator >= 0 ? (
                          <>
                            <Text style={hasUnread && styles.unreadPreviewSender}>
                              {chat.lastMessage.slice(0, previewSeparator + 2)}
                            </Text>
                            <Text style={hasUnread && styles.unreadChatPreview}>
                              {chat.lastMessage.slice(previewSeparator + 2)}
                            </Text>
                          </>
                        ) : (
                          <Text style={hasUnread && styles.unreadChatPreview}>
                            {chat.lastMessage || 'No messages yet'}
                          </Text>
                        )}
                      </Text>
                    </View>
                  </View>
                  {(chat.unread_count ?? 0) > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{chat.unread_count}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={17} color="#94a3b8" />
                </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: colors.page,
  },
  content: {
    flex: 1,
    backgroundColor: colors.page,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  heroCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.heroSurface, borderWidth: 1, borderColor: colors.heroBorder, borderRadius: 11, padding: 16, marginBottom: 14 },
  heroIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1 },
  heroEyebrow: { color: colors.teal, fontSize: 9, letterSpacing: 1, fontWeight: '800', marginBottom: 5 },
  heroTitle: { color: colors.navy, fontSize: 17, fontWeight: '800' },
  heroSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0d3b4f',
  },
  subtitle: {
    fontSize: 13,
    color: '#5b6e8c',
    marginTop: 2,
    fontWeight: '500',
  },
  avatarBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  searchBox: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
  },
  chatList: { marginBottom: 12 },
  chatTable: { backgroundColor: colors.surface, borderRadius: 11, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    padding: 18,
  },
  retryText: {
    color: '#1a5f7a',
    fontWeight: '700',
    padding: 10,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatItemLast: { borderBottomWidth: 0 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: colors.tealLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarTextSmall: {
    color: colors.teal,
    fontWeight: '800',
    fontSize: 13,
  },
  onlineDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2ecc71',
    right: -2,
    bottom: -2,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 10,
  },
  chatMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
    flex: 1,
  },
  chatTime: {
    fontSize: 11,
    color: '#64748b',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  buddyBadge: {
    backgroundColor: '#e0f2fe',
  },
  groupBadge: {
    backgroundColor: '#e9d5ff',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f172a',
  },
  chatPreview: {
    color: colors.muted,
    fontSize: 12,
    flex: 1,
  },
  unreadChatPreview: {
    color: colors.navy,
    fontWeight: '800',
  },
  unreadPreviewSender: {
    color: colors.navy,
    fontWeight: '400',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1a5f7a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
});
