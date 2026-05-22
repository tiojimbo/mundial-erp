import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, WorkspaceMemberRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { MembersRepository } from '../workspaces/members/members.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly membersRepository: MembersRepository,
  ) {}

  async create(dto: CreateUserDto, actorId: string): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const dtoSpaceId = dto.spaceId ?? dto.departmentId;
    const user = await this.usersRepository.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: dto.role,
      space: dtoSpaceId ? { connect: { id: dtoSpaceId } } : undefined,
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
          role: WorkspaceMemberRole.MEMBER,
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
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    const dtoSpaceId = dto.spaceId ?? dto.departmentId;
    if (dtoSpaceId !== undefined) {
      updateData.space = dtoSpaceId
        ? { connect: { id: dtoSpaceId } }
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

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException('Email já cadastrado');
      }
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) updateData.name = dto.fullName;
    if (dto.email !== undefined) updateData.email = dto.email;

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

  async remove(id: string): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    await this.usersRepository.softDelete(id);
  }
}
