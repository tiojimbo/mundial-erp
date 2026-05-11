import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';

export class UpdateChannelOrganizationDto {
  @ApiProperty({
    description:
      'JSON livre com a organizacao de canais do usuario neste workspace. Hoppe nao define shape.',
  })
  @IsDefined()
  organizationData!: unknown;
}

export class ChannelOrganizationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  organizationData!: unknown;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
