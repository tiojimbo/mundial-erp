import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators';
import { FinancialSummaryService } from './financial-summary.service';
import { FinancialSummaryResponseDto } from './dto/financial-summary-response.dto';

@ApiTags('Financial Summary')
@ApiBearerAuth()
@Controller('financial-summary')
export class FinancialSummaryController {
  constructor(private readonly financialSummaryService: FinancialSummaryService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Dashboard financeiro — totais, vencidos, projeção' })
  @ApiResponse({ status: 200, type: FinancialSummaryResponseDto })
  getSummary() {
    return this.financialSummaryService.getSummary();
  }
}
