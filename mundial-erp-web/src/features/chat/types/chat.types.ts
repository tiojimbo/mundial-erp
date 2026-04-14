export type ChannelVisibility = 'PUBLIC' | 'PRIVATE';
export type ChannelType = 'CHANNEL' | 'DIRECT_MESSAGE';
export type ChatMessageType = 'MESSAGE' | 'POST';
export type ContentFormat = 'TEXT_MD' | 'TEXT_PLAIN';
export type ChannelMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type Channel = {
  id: string;
  name: string | null;
  description: string | null;
  topic: string | null;
  type: ChannelType;
  visibility: ChannelVisibility;
  locationEntity: string | null;
  locationId: string | null;
  memberCount: number;
  unreadCount: number;
  lastMessage: MessageSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageSummary = {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
};

export type ChannelMember = {
  id: string;
  userId: string;
  role: ChannelMemberRole;
  isFollower: boolean;
  lastReadAt: string | null;
  closedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export type Message = {
  id: string;
  channelId: string;
  author: {
    id: string;
    name: string;
    email: string | null;
  };
  parentMessageId: string | null;
  type: ChatMessageType;
  content: string;
  contentFormat: ContentFormat;
  richContent: Record<string, unknown> | null;
  assignee: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  resolved: boolean;
  postData: Record<string, unknown> | null;
  editedAt: string | null;
  replyCount: number;
  reactions: ReactionGroup[];
  createdAt: string;
  updatedAt: string;
};

export type ReactionGroup = {
  emojiName: string;
  count: number;
  userIds: string[];
  userNames: string[];
};

export type Reaction = {
  id: string;
  messageId: string;
  userId: string;
  emojiName: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
};

// --- Payloads ---

export type CreateChannelPayload = {
  name: string;
  description?: string;
  topic?: string;
  visibility?: ChannelVisibility;
  userIds?: string[];
};

export type CreateDmPayload = {
  userIds?: string[];
};

export type UpdateChannelPayload = {
  name?: string;
  description?: string;
  topic?: string;
  visibility?: ChannelVisibility;
};

export type SendMessagePayload = {
  content: string;
  type?: ChatMessageType;
  contentFormat?: ContentFormat;
  richContent?: Record<string, unknown>;
  parentMessageId?: string;
  assigneeId?: string;
  postData?: Record<string, unknown>;
  followers?: string[];
};

export type UpdateMessagePayload = {
  content?: string;
  contentFormat?: ContentFormat;
  richContent?: Record<string, unknown>;
  assigneeId?: string;
  postData?: Record<string, unknown>;
  resolved?: boolean;
};

export type AddMembersPayload = {
  userIds: string[];
  role?: ChannelMemberRole;
};

// --- Filters ---

export type ChannelFilters = {
  cursor?: string;
  limit?: number;
  search?: string;
  type?: ChannelType;
  isFollower?: boolean;
  includeClosed?: boolean;
};

export type MessageFilters = {
  cursor?: string;
  limit?: number;
};
