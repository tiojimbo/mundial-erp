import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChannelMemberRole } from '@prisma/client';
import { ChannelsRepository } from './channels.repository';

@Injectable()
export class ChannelAccessService {
  constructor(private readonly channelsRepository: ChannelsRepository) {}

  isDmType(type: string): boolean {
    return type === 'DIRECT' || type === 'GROUP_DM';
  }

  async assertMembership(channelId: string, userId: string): Promise<void> {
    const isMember = await this.channelsRepository.isMember(channelId, userId);
    if (!isMember)
      throw new ForbiddenException('Voce nao e membro deste canal');
  }

  async ensureMembershipOrAutoJoin(
    channelId: string,
    userId: string,
  ): Promise<void> {
    const channel = await this.channelsRepository.findById(channelId);
    if (!channel) throw new NotFoundException('Canal nao encontrado');

    const isMember = await this.channelsRepository.isMember(channelId, userId);
    if (isMember) return;

    if (channel.type === 'PUBLIC') {
      await this.channelsRepository.addMember(channelId, userId, 'MEMBER');
      return;
    }

    throw new ForbiddenException('Voce nao e membro deste canal');
  }

  async isMember(channelId: string, userId: string): Promise<boolean> {
    return this.channelsRepository.isMember(channelId, userId);
  }

  async getMemberRole(
    channelId: string,
    userId: string,
  ): Promise<ChannelMemberRole | null> {
    return this.channelsRepository.getMemberRole(channelId, userId);
  }
}
