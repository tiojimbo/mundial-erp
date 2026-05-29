import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppearanceMode, User } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  avatar: string | null;

  @ApiPropertyOptional()
  themeColor: string | null;

  @ApiProperty({ enum: AppearanceMode })
  appearance: AppearanceMode;

  @ApiPropertyOptional()
  spaceId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.isActive = user.isActive;
    dto.avatar = user.avatar;
    dto.themeColor = user.themeColor;
    dto.appearance = user.appearance;
    dto.spaceId = user.spaceId;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
