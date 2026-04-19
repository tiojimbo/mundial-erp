import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class SnoozeNotificationDto {
  @ApiProperty({
    example: '2026-04-17T09:00:00.000Z',
    description: 'Data/hora ate quando adiar a notificacao (ISO 8601)',
  })
  @IsISO8601()
  until: string;
}
