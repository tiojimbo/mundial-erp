import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const INBOX_VIEWS = ['all', 'primary', 'other', 'later', 'cleared'] as const;

export type InboxView = (typeof INBOX_VIEWS)[number];

export class BulkActionDto {
  @ApiProperty({
    enum: INBOX_VIEWS,
    example: 'primary',
    description: 'Visao da inbox para aplicar a acao em massa',
  })
  @IsIn(INBOX_VIEWS)
  view: InboxView;
}
