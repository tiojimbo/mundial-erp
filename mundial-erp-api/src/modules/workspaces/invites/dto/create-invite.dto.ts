import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';
import { IsEmail, IsEnum, MaxLength } from 'class-validator';

export class CreateInviteDto {
  @ApiProperty({ example: 'user@example.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    enum: WorkspaceMemberRole,
    description:
      'Role atribuida ao membro quando o convite for aceito. OWNER nao e permitido aqui.',
  })
  @IsEnum(WorkspaceMemberRole)
  role!: WorkspaceMemberRole;
}
