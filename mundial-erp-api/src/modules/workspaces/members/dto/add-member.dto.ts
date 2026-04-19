import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({ description: 'ID do User a adicionar como membro' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    enum: WorkspaceMemberRole,
    default: WorkspaceMemberRole.MEMBER,
  })
  @IsEnum(WorkspaceMemberRole)
  role!: WorkspaceMemberRole;
}
