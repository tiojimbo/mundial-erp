import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { PersonalAccessTokensRepository } from './personal-access-tokens.repository';
import { CreatePersonalAccessTokenDto } from './dto/create-personal-access-token.dto';
import { PersonalAccessTokenResponseDto } from './dto/personal-access-token-response.dto';
import { PersonalAccessTokenCreatedDto } from './dto/personal-access-token-created.dto';

const TOKEN_BYTES = 32;
const PREFIX_VISIBLE_LENGTH = 10;

@Injectable()
export class PersonalAccessTokensService {
  private readonly logger = new Logger(PersonalAccessTokensService.name);

  constructor(private readonly repository: PersonalAccessTokensRepository) {}

  async create(
    userId: string,
    workspaceId: string | undefined,
    dto: CreatePersonalAccessTokenDto,
  ): Promise<PersonalAccessTokenCreatedDto> {
    if (!workspaceId) {
      throw new BadRequestException('Workspace ativo nao definido');
    }
    const token = this.generateToken();
    const tokenHash = this.hash(token);
    const prefix = token.slice(0, PREFIX_VISIBLE_LENGTH);

    const entity = await this.repository.create({
      userId,
      workspaceId,
      name: dto.name,
      prefix,
      tokenHash,
    });

    this.logger.log(
      `pk_created id=${entity.id} userId=${userId} workspaceId=${workspaceId} prefix=${prefix} name="${dto.name}"`,
    );

    const response = new PersonalAccessTokenCreatedDto();
    Object.assign(
      response,
      PersonalAccessTokenResponseDto.fromEntity(entity),
      { token },
    );
    return response;
  }

  async findManyByUser(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PersonalAccessTokenResponseDto[]> {
    const entities = await this.repository.findManyByUser(userId, {
      skip: pagination.skip,
      take: pagination.limit,
    });
    return entities.map(PersonalAccessTokenResponseDto.fromEntity);
  }

  async revoke(id: string, userId: string): Promise<void> {
    const entity = await this.repository.findByIdAndUser(id, userId);
    if (!entity || entity.revokedAt) {
      return;
    }
    await this.repository.revoke(id);
    this.logger.log(
      `pk_revoked id=${entity.id} userId=${userId} prefix=${entity.prefix}`,
    );
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateToken(): string {
    return 'pk_' + randomBytes(TOKEN_BYTES).toString('base64url');
  }
}
