import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto';

export class NotificationCountsDto {
  @ApiProperty({ example: 12, description: 'Total de notificacoes nao limpas' })
  all: number;

  @ApiProperty({ example: 8, description: 'Notificacoes primarias nao lidas' })
  primary: number;

  @ApiProperty({ example: 4, description: 'Notificacoes outras nao lidas' })
  other: number;

  @ApiProperty({ example: 2, description: 'Notificacoes adiadas (snoozed)' })
  later: number;

  @ApiProperty({ example: 5, description: 'Notificacoes limpas (cleared)' })
  cleared: number;
}

export class NotificationsListResponseDto {
  @ApiProperty({
    type: [NotificationResponseDto],
    description: 'Lista de notificacoes',
  })
  items: NotificationResponseDto[];

  @ApiProperty({
    type: NotificationCountsDto,
    description: 'Contadores por visao',
  })
  counts: NotificationCountsDto;
}
