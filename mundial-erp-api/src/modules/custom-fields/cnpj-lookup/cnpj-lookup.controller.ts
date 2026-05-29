import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CnpjLookupService } from './cnpj-lookup.service';
import { CnpjLookupResponseDto } from './dto/cnpj-lookup.response.dto';
import { WorkspaceRoles } from '../../auth/decorators';
import { WorkspaceId } from '../../workspaces/decorators/workspace-id.decorator';

@ApiTags('Task Custom Fields')
@ApiBearerAuth()
@Controller()
export class CnpjLookupController {
  constructor(private readonly service: CnpjLookupService) {}

  @Get('custom-fields/cnpj-lookup/:cnpj')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Consulta dados públicos de um CNPJ (BrasilAPI + ReceitaWS)',
  })
  @ApiResponse({ status: 200, type: CnpjLookupResponseDto })
  @ApiResponse({ status: 404, description: 'CNPJ não encontrado' })
  @ApiResponse({ status: 422, description: 'CNPJ inválido' })
  @ApiResponse({ status: 502, description: 'Fontes externas indisponíveis' })
  lookup(
    @WorkspaceId() _workspaceId: string,
    @Param('cnpj') cnpj: string,
  ): Promise<CnpjLookupResponseDto> {
    return this.service.lookup(cnpj);
  }
}
