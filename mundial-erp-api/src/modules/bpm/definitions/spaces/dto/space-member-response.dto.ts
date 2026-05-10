import { ApiProperty } from '@nestjs/swagger';
import { MemberPermission } from '@prisma/client';

export class SpaceMemberUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  avatar: string | null;
}

export class SpaceMemberResponseDto {
  @ApiProperty()
  spaceId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: MemberPermission })
  permission: MemberPermission;

  @ApiProperty()
  source: 'direct' | 'workspace';

  @ApiProperty()
  inherited: boolean;

  @ApiProperty({ type: SpaceMemberUserDto })
  user: SpaceMemberUserDto;
}
