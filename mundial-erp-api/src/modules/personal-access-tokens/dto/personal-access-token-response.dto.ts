import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonalAccessToken, User } from '@prisma/client';

type PersonalAccessTokenWithUser = PersonalAccessToken & {
  user: Pick<User, 'id' | 'name' | 'email'>;
};

export class PersonalAccessTokenUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;
}

export class PersonalAccessTokenResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ example: 'pk_0xZ0YWQ' })
  prefix: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  lastUsedAt: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  expiresAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: PersonalAccessTokenUserDto })
  user: PersonalAccessTokenUserDto;

  static fromEntity(entity: PersonalAccessTokenWithUser): PersonalAccessTokenResponseDto {
    const dto = new PersonalAccessTokenResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.prefix = entity.prefix;
    dto.lastUsedAt = entity.lastUsedAt;
    dto.expiresAt = entity.expiresAt;
    dto.createdAt = entity.createdAt;
    dto.user = {
      id: entity.user.id,
      name: entity.user.name,
      email: entity.user.email,
    };
    return dto;
  }
}
