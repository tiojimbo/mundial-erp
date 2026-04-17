import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn } from 'class-validator';

const INBOX_VIEWS = ['all', 'primary', 'other', 'later', 'cleared'] as const;

export type InboxView = (typeof INBOX_VIEWS)[number];

export class NotificationQueryDto {
  @ApiPropertyOptional({ enum: INBOX_VIEWS, default: 'all', description: 'Visualizacao da caixa de entrada' })
  @IsOptional()
  @IsIn(INBOX_VIEWS)
  view: InboxView = 'all';
}
