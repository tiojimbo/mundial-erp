import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NotificationType, NotificationCategory } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({
    example: 'cuid-user-id',
    description: 'ID do usuario destinatario',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: NotificationType, example: 'TASK_OVERDUE' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ enum: NotificationCategory, example: 'PRIMARY' })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({
    example: 'Tarefa atrasada',
    description: 'Titulo da notificacao',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'A tarefa "Revisar pedido #42" esta atrasada.',
    description: 'Descricao da notificacao',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @ApiPropertyOptional({
    example: 'cuid-entity-id',
    description: 'ID da entidade relacionada',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({
    example: '/bpm/processes/abc/tasks/xyz',
    description: 'URL da entidade relacionada',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  entityUrl?: string;
}
