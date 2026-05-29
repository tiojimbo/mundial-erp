import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';
import { WorkspaceRoles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import { FinancialSummaryService } from './financial-summary.service';
import { FinancialSummaryResponseDto } from './dto/financial-summary-response.dto';

@ApiTags('Financial Summary')
@ApiBearerAuth()
@Controller('financial-summary')
export class FinancialSummaryController {
  constructor(
    private readonly financialSummaryService: FinancialSummaryService,
  ) {}

  @Get()
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({
    summary: 'Dashboard financeiro — totais, vencidos, projeção',
  })
  @ApiResponse({ status: 200, type: FinancialSummaryResponseDto })
  getSummary(@WorkspaceId() workspaceId: string) {
    return this.financialSummaryService.getSummary(workspaceId);
  }
}
