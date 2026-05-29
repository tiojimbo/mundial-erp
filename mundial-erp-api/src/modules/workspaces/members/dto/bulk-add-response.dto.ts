import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';

export class BulkInvitedUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  name!: string | null;

  @ApiProperty({ enum: WorkspaceMemberRole })
  permission!: WorkspaceMemberRole;

  @ApiProperty()
  accepted!: boolean;

  @ApiProperty()
  isNewUser!: boolean;
}

export class BulkAddResponseDto {
  @ApiProperty({ type: [BulkInvitedUserDto] })
  invited!: BulkInvitedUserDto[];

  @ApiProperty({ type: [String] })
  skipped!: string[];
}
