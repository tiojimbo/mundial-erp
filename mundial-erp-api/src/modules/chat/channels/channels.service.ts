import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChannelMemberRole } from '@prisma/client';
import { createHash } from 'crypto';
import { ChannelsRepository } from './channels.repository';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CreateChannelLocationDto } from './dto/create-channel-location.dto';
import { CreateDmDto } from './dto/create-dm.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { ListChannelsQueryDto } from './dto/list-channels-query.dto';
import { ChannelResponseDto } from './dto/channel-response.dto';
import { CursorPaginationDto } from '../../../common/dtos/cursor-pagination.dto';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly channelsRepository: ChannelsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createChannel(
    dto: CreateChannelDto,
    userId: string,
  ): Promise<ChannelResponseDto> {
    const existing = await this.channelsRepository.findByName(dto.name);
    if (existing) return ChannelResponseDto.fromEntity(existing);

    const entity = await this.channelsRepository.create({
      name: dto.name,
      description: dto.description,
      topic: dto.topic,
      visibility: dto.visibility ?? 'PUBLIC',
      type: 'CHANNEL',
      createdBy: { connect: { id: userId } },
      members: {
        create: { userId, role: 'OWNER' },
      },
    });

    if (dto.userIds?.length) {
      await this.channelsRepository.addMembersMany(
        entity.id,
        dto.userIds,
        'MEMBER',
      );
    }

    this.eventEmitter.emit('chat.channel.created', { channelId: entity.id });
    return ChannelResponseDto.fromEntity(entity);
  }

  async createChannelByLocation(
    dto: CreateChannelLocationDto,
    userId: string,
  ): Promise<ChannelResponseDto> {
    const existing = await this.channelsRepository.findByLocation(
      dto.locationEntity,
      dto.locationId,
    );
    if (existing) return ChannelResponseDto.fromEntity(existing);

    const entity = await this.channelsRepository.create({
      description: dto.description,
      topic: dto.topic,
      visibility: dto.visibility ?? 'PUBLIC',
      type: 'CHANNEL',
      locationEntity: dto.locationEntity,
      locationId: dto.locationId,
      createdBy: { connect: { id: userId } },
      members: { create: { userId, role: 'OWNER' } },
    });

    if (dto.userIds?.length) {
      await this.channelsRepository.addMembersMany(
        entity.id,
        dto.userIds,
        'MEMBER',
      );
    }

    return ChannelResponseDto.fromEntity(entity);
  }

  async createDm(
    dto: CreateDmDto,
    userId: string,
  ): Promise<ChannelResponseDto> {
    const participantIds = [
      ...new Set([userId, ...(dto.userIds ?? [])]),
    ].sort();
    const hash = createHash('sha256')
      .update(participantIds.join(':'))
      .digest('hex');

    const existing =
      await this.channelsRepository.findDmByParticipantHash(hash);
    if (existing) return ChannelResponseDto.fromEntity(existing);

    const entity = await this.channelsRepository.create({
      type: 'DIRECT_MESSAGE',
      visibility: 'PRIVATE',
      participantHash: hash,
      createdBy: { connect: { id: userId } },
      members: {
        createMany: {
          data: participantIds.map((id, i) => ({
            userId: id,
            role: i === 0 ? ('OWNER' as ChannelMemberRole) : ('MEMBER' as ChannelMemberRole),
          })),
        },
      },
    });

    return ChannelResponseDto.fromEntity(entity);
  }

  async findAll(query: ListChannelsQueryDto, userId: string) {
    return this.channelsRepository.findManyForUser(userId, {
      cursor: query.cursor,
      limit: query.limit,
      search: query.search,
      type: query.type,
      isFollower: query.isFollower,
      includeClosed: query.includeClosed,
    });
  }

  async findById(
    channelId: string,
    userId: string,
  ): Promise<ChannelResponseDto> {
    const entity = await this.channelsRepository.findById(channelId);
    if (!entity) throw new NotFoundException('Canal nao encontrado');

    if (entity.visibility === 'PRIVATE') {
      const isMember = await this.channelsRepository.isMember(
        channelId,
        userId,
      );
      if (!isMember) throw new NotFoundException('Canal nao encontrado');
    }

    const activeMemberCount =
      await this.channelsRepository.countActiveMembers(channelId);
    return ChannelResponseDto.fromEntity(entity, { activeMemberCount });
  }

  async update(
    channelId: string,
    dto: UpdateChannelDto,
    userId: string,
  ): Promise<ChannelResponseDto> {
    const entity = await this.channelsRepository.findById(channelId);
    if (!entity) throw new NotFoundException('Canal nao encontrado');

    const role = await this.channelsRepository.getMemberRole(
      channelId,
      userId,
    );
    if (role !== 'OWNER' && role !== 'ADMIN') {
      throw new ForbiddenException(
        'Somente OWNER ou ADMIN podem atualizar o canal',
      );
    }

    const updated = await this.channelsRepository.update(channelId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.topic !== undefined && { topic: dto.topic }),
      ...(dto.visibility !== undefined && { visibility: dto.visibility }),
      ...(dto.locationEntity !== undefined && {
        locationEntity: dto.locationEntity,
      }),
      ...(dto.locationId !== undefined && { locationId: dto.locationId }),
    });

    this.eventEmitter.emit('chat.channel.updated', { channelId });
    return ChannelResponseDto.fromEntity(updated);
  }

  async remove(channelId: string, userId: string): Promise<void> {
    const entity = await this.channelsRepository.findById(channelId);
    if (!entity) throw new NotFoundException('Canal nao encontrado');

    const role = await this.channelsRepository.getMemberRole(
      channelId,
      userId,
    );
    if (role !== 'OWNER') {
      throw new ForbiddenException('Somente o OWNER pode deletar o canal');
    }

    await this.channelsRepository.softDelete(channelId);
  }

  async addMembers(
    channelId: string,
    dto: AddMembersDto,
    userId: string,
  ): Promise<void> {
    const channel = await this.channelsRepository.findById(channelId);
    if (!channel) throw new NotFoundException('Canal nao encontrado');

    if (channel.type === 'DIRECT_MESSAGE') {
      throw new BadRequestException(
        'Nao e possivel adicionar membros a um DM. Crie um novo DM com os participantes desejados.',
      );
    }

    if (channel.visibility === 'PRIVATE') {
      const role = await this.channelsRepository.getMemberRole(
        channelId,
        userId,
      );
      if (role !== 'OWNER' && role !== 'ADMIN') {
        throw new ForbiddenException(
          'Somente OWNER ou ADMIN podem adicionar membros a canais privados',
        );
      }
    }

    await this.channelsRepository.addMembersMany(
      channelId,
      dto.userIds,
      dto.role ?? 'MEMBER',
    );
    this.eventEmitter.emit('chat.channel.members-added', {
      channelId,
      userIds: dto.userIds,
    });
  }

  async removeMember(
    channelId: string,
    targetUserId: string,
    userId: string,
  ): Promise<void> {
    const channel = await this.channelsRepository.findById(channelId);
    if (!channel) throw new NotFoundException('Canal nao encontrado');

    if (channel.type === 'DIRECT_MESSAGE') {
      throw new BadRequestException(
        'Nao e possivel remover membros de um DM. Use close para esconder.',
      );
    }

    if (targetUserId !== userId) {
      const role = await this.channelsRepository.getMemberRole(
        channelId,
        userId,
      );
      if (role !== 'OWNER' && role !== 'ADMIN') {
        throw new ForbiddenException(
          'Somente OWNER ou ADMIN podem remover membros',
        );
      }
    }

    await this.channelsRepository.removeMember(channelId, targetUserId);
    this.eventEmitter.emit('chat.channel.member-removed', {
      channelId,
      userId: targetUserId,
    });
  }

  async updateMemberRole(
    channelId: string,
    targetUserId: string,
    role: ChannelMemberRole,
    userId: string,
  ): Promise<void> {
    const callerRole = await this.channelsRepository.getMemberRole(
      channelId,
      userId,
    );
    if (callerRole !== 'OWNER') {
      throw new ForbiddenException('Somente o OWNER pode alterar roles');
    }
    await this.channelsRepository.updateMemberRole(
      channelId,
      targetUserId,
      role,
    );
  }

  async followChannel(channelId: string, userId: string): Promise<void> {
    await this.assertMembership(channelId, userId);
    await this.channelsRepository.setFollower(channelId, userId, true);
  }

  async unfollowChannel(channelId: string, userId: string): Promise<void> {
    await this.assertMembership(channelId, userId);
    await this.channelsRepository.setFollower(channelId, userId, false);
  }

  async closeDm(channelId: string, userId: string): Promise<void> {
    const channel = await this.channelsRepository.findById(channelId);
    if (!channel || channel.type !== 'DIRECT_MESSAGE') {
      throw new BadRequestException('Somente DMs podem ser fechados');
    }
    await this.channelsRepository.closeDm(channelId, userId);
  }

  async openDm(channelId: string, userId: string): Promise<void> {
    await this.channelsRepository.openDm(channelId, userId);
  }

  async markAsRead(channelId: string, userId: string): Promise<void> {
    await this.channelsRepository.updateLastRead(channelId, userId);
  }

  async autoJoinIfPublic(channelId: string, userId: string): Promise<void> {
    const channel = await this.channelsRepository.findById(channelId);
    if (!channel) throw new NotFoundException('Canal nao encontrado');

    if (channel.visibility === 'PUBLIC') {
      const isMember = await this.channelsRepository.isMember(
        channelId,
        userId,
      );
      if (!isMember) {
        await this.channelsRepository.addMember(channelId, userId, 'MEMBER');
      }
    }
  }

  async findMembers(
    channelId: string,
    query: CursorPaginationDto,
    userId: string,
  ) {
    await this.assertMembership(channelId, userId);
    return this.channelsRepository.findMembers(channelId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  async findFollowers(
    channelId: string,
    query: CursorPaginationDto,
    userId: string,
  ) {
    await this.assertMembership(channelId, userId);
    return this.channelsRepository.findFollowers(channelId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  // --- Metodos publicos para uso por outros services (Messages, Reactions, Gateway) ---

  async assertMembership(
    channelId: string,
    userId: string,
  ): Promise<void> {
    const isMember = await this.channelsRepository.isMember(
      channelId,
      userId,
    );
    if (!isMember)
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

  async getChannelType(channelId: string): Promise<string | null> {
    const channel = await this.channelsRepository.findById(channelId);
    return channel?.type ?? null;
  }

  async reopenClosedDmForRecipients(
    channelId: string,
    senderId: string,
  ): Promise<void> {
    const channel = await this.channelsRepository.findById(channelId);
    if (!channel || channel.type !== 'DIRECT_MESSAGE') return;

    const members = (
      await this.channelsRepository.findMembers(channelId, { limit: 15 })
    ).items;

    for (const member of members) {
      if (member.userId !== senderId && member.closedAt) {
        await this.channelsRepository.openDm(channelId, member.userId);
      }
    }
  }

  async findChannelIdsForUser(userId: string): Promise<string[]> {
    return this.channelsRepository.findChannelIdsForUser(userId);
  }
}
