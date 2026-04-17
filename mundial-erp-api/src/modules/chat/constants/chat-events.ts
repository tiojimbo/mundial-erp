export const CHAT_EVENTS = {
  CHANNEL_CREATED: 'chat.channel.created',
  CHANNEL_UPDATED: 'chat.channel.updated',
  CHANNEL_MEMBERS_ADDED: 'chat.channel.members-added',
  CHANNEL_MEMBER_REMOVED: 'chat.channel.member-removed',
  MESSAGE_CREATED: 'chat.message.created',
  MESSAGE_UPDATED: 'chat.message.updated',
  MESSAGE_DELETED: 'chat.message.deleted',
  REACTION_ADDED: 'chat.reaction.added',
  REACTION_REMOVED: 'chat.reaction.removed',
} as const;

export type ChatEventName = (typeof CHAT_EVENTS)[keyof typeof CHAT_EVENTS];
