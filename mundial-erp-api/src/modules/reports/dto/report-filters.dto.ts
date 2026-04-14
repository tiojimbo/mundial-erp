import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ReportFiltersDto {
  @ApiPropertyOptional({ description: 'Data inicial do periodo' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({ description: 'Data final do periodo' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;

  @ApiPropertyOptional({ description: 'Filtrar por empresa' })
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class SalesReportFiltersDto extends ReportFiltersDto {
  @ApiPropertyOptional({ description: 'Filtrar por cliente' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

export class CashflowFiltersDto extends ReportFiltersDto {
  @ApiPropertyOptional({
    description: 'Agrupamento: day, week, month',
    default: 'month',
    enum: ['day', 'week', 'month'],
  })
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  groupBy: string = 'month';
}

export class SalesChartFiltersDto extends ReportFiltersDto {
  @ApiPropertyOptional({
    description: 'Agrupamento: day, week, month',
    default: 'month',
    enum: ['day', 'week', 'month'],
  })
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  groupBy: string = 'month';
}
