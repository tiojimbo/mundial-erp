import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

export class ListClientsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por nome, nome fantasia ou CPF/CNPJ' })
  @IsOptional()
  @IsString()
  search?: string;
}
