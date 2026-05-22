import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationPreferenceType,
} from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class UpsertNotificationPreferenceDto {
  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class NotificationPreferenceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: NotificationPreferenceType })
  type!: NotificationPreferenceType;

  @ApiProperty({ enum: NotificationChannel, isArray: true })
  channels!: NotificationChannel[];

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
