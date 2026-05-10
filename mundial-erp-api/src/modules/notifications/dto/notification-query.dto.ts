import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const INBOX_VIEWS = ['all', 'primary', 'other', 'later', 'cleared'] as const;

export type InboxView = (typeof INBOX_VIEWS)[number];

export class NotificationQueryDto {
  @ApiPropertyOptional({
    enum: INBOX_VIEWS,
    default: 'all',
    description: 'Visualização da caixa de entrada',
  })
  @IsOptional()
  @IsIn(INBOX_VIEWS)
  view: InboxView = 'all';

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
