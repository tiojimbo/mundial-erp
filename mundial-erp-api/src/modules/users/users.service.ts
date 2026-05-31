import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, WorkspaceMemberRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import sharp from 'sharp';
import { UsersRepository } from './users.repository';
import { MembersRepository } from '../workspaces/members/members.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { S3AdapterService } from '../../common/adapters/s3-adapter.service';

const BCRYPT_ROUNDS = 12;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly membersRepository: MembersRepository,
    private readonly s3: S3AdapterService,
  ) {}

  async create(dto: CreateUserDto, actorId: string): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.usersRepository.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      space: dto.spaceId ? { connect: { id: dto.spaceId } } : undefined,
    });

    await this.addToActorWorkspaces(user.id, actorId);

    return UserResponseDto.fromEntity(user);
  }

  private async addToActorWorkspaces(
    userId: string,
    actorId: string,
  ): Promise<void> {
    try {
      const workspaceIds =
        await this.membersRepository.findWorkspaceIdsByUser(actorId);
      for (const workspaceId of workspaceIds) {
        await this.membersRepository.create({
          workspaceId,
          userId,
          role: WorkspaceMemberRole.EDITOR,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao vincular usuario ${userId} aos workspaces do ator ${actorId}: ${String(error)}`,
      );
    }
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.usersRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(UserResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return UserResponseDto.fromEntity(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException('Email já cadastrado');
      }
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.spaceId !== undefined) {
      updateData.space = dto.spaceId
        ? { connect: { id: dto.spaceId } }
        : { disconnect: true };
    }
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    const updated = await this.usersRepository.update(id, updateData);
    return UserResponseDto.fromEntity(updated);
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) updateData.name = dto.fullName;
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;
    if (dto.themeColor !== undefined) updateData.themeColor = dto.themeColor;
    if (dto.appearance !== undefined) updateData.appearance = dto.appearance;

    if (dto.password) {
      const currentValid = await bcrypt.compare(
        dto.currentPassword ?? '',
        user.passwordHash,
      );
      if (!currentValid) {
        throw new UnauthorizedException('Senha atual incorreta');
      }
      updateData.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    const updated = await this.usersRepository.update(userId, updateData);
    return UserResponseDto.fromEntity(updated);
  }

  async uploadAvatar(
    userId: string,
    imageDataUrl: string,
  ): Promise<UserResponseDto> {
    const match = /^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i.exec(
      imageDataUrl,
    );
    if (!match) {
      throw new BadRequestException(
        'Imagem invalida: esperado data URL base64 (png, jpeg ou webp)',
      );
    }
    const inputBuffer = Buffer.from(match[2], 'base64');
    if (inputBuffer.length > AVATAR_MAX_BYTES) {
      throw new BadRequestException('Imagem excede o limite de 2MB');
    }
    const buffer = await sharp(inputBuffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();
    const key = `avatars/users/${userId}.jpg`;
    await this.s3.putObject({ key, body: buffer, contentType: 'image/jpeg' });
    const updated = await this.usersRepository.update(userId, { avatar: key });
    return UserResponseDto.fromEntity(updated);
  }

  async deleteAvatar(userId: string): Promise<UserResponseDto> {
    const updated = await this.usersRepository.update(userId, { avatar: null });
    return UserResponseDto.fromEntity(updated);
  }

  async getAvatarSignedUrl(key: string): Promise<string> {
    const signed = await this.s3.getSignedGetUrl({
      key,
      expiresInSeconds: 3600,
    });
    return signed.url;
  }

  async remove(id: string): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    await this.usersRepository.softDelete(id);
  }
}
