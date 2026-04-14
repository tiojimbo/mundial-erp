import { create } from 'zustand';

type TypingUser = {
  userId: string;
  timestamp: number;
};

type ChatState = {
  activeChannelId: string | null;
  setActiveChannel: (id: string | null) => void;

  activeThreadMessageId: string | null;
  openThread: (messageId: string) => void;
  closeThread: () => void;

  typingUsers: Record<string, TypingUser[]>;
  setTyping: (channelId: string, userId: string) => void;
  clearTyping: (channelId: string, userId: string) => void;

  onlineUserIds: string[];
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;

  unreadCounts: Record<string, number>;
  setUnreadCount: (channelId: string, count: number) => void;
  incrementUnread: (channelId: string) => void;
  clearUnread: (channelId: string) => void;
  totalUnread: () => number;
};

export const useChatStore = create<ChatState>((set, get) => ({
  activeChannelId: null,
  setActiveChannel: (id) => set({ activeChannelId: id }),

  activeThreadMessageId: null,
  openThread: (messageId) => set({ activeThreadMessageId: messageId }),
  closeThread: () => set({ activeThreadMessageId: null }),

  typingUsers: {},
  setTyping: (channelId, userId) =>
    set((state) => {
      const current = state.typingUsers[channelId] ?? [];
      const filtered = current.filter((t) => t.userId !== userId);
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: [...filtered, { userId, timestamp: Date.now() }],
        },
      };
    }),
  clearTyping: (channelId, userId) =>
    set((state) => {
      const current = state.typingUsers[channelId] ?? [];
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: current.filter((t) => t.userId !== userId),
        },
      };
    }),

  onlineUserIds: [],
  setUserOnline: (userId) =>
    set((state) => ({
      onlineUserIds: state.onlineUserIds.includes(userId)
        ? state.onlineUserIds
        : [...state.onlineUserIds, userId],
    })),
  setUserOffline: (userId) =>
    set((state) => ({
      onlineUserIds: state.onlineUserIds.filter((id) => id !== userId),
    })),

  unreadCounts: {},
  setUnreadCount: (channelId, count) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [channelId]: count },
    })),
  incrementUnread: (channelId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [channelId]: (state.unreadCounts[channelId] ?? 0) + 1,
      },
    })),
  clearUnread: (channelId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [channelId]: 0 },
    })),
  totalUnread: () => {
    const counts = get().unreadCounts;
    return Object.values(counts).reduce((sum, c) => sum + c, 0);
  },
}));
