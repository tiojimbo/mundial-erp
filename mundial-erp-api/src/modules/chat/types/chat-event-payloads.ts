import type { MessageResponseDto } from '../messages/dto/message-response.dto';

export type ChannelCreatedPayload = {
  channelId: string;
};

export type ChannelUpdatedPayload = {
  channelId: string;
};

export type ChannelMembersAddedPayload = {
  channelId: string;
  userIds: string[];
};

export type ChannelMemberRemovedPayload = {
  channelId: string;
  userId: string;
};

export type MessageCreatedPayload = {
  message: MessageResponseDto;
  channelId: string;
};

export type MessageUpdatedPayload = {
  message: MessageResponseDto;
  channelId: string;
};

export type MessageDeletedPayload = {
  messageId: string;
  channelId: string;
};

export type ReactionPayload = {
  messageId: string;
  channelId: string;
  userId: string;
  emojiName: string;
};
