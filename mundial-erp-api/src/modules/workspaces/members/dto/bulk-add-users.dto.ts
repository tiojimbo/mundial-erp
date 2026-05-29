import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  ValidateNested,
} from 'class-validator';

export class BulkUserEntryDto {
  @ApiProperty({ example: 'usuario@mundial.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: WorkspaceMemberRole })
  @IsEnum(WorkspaceMemberRole)
  permission!: WorkspaceMemberRole;
}

export class BulkAddUsersDto {
  @ApiProperty({ type: [BulkUserEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkUserEntryDto)
  users!: BulkUserEntryDto[];
}
