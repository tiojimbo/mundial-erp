import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ContentFormat } from '@prisma/client';
import { CursorPaginationDto } from '../../../../common/dtos/cursor-pagination.dto';

export class ListMessagesQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional({ enum: ContentFormat, default: 'TEXT_MD' })
  @IsOptional()
  @IsEnum(ContentFormat)
  contentFormat?: ContentFormat;
}
