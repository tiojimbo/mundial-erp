import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AutomationsService } from './automations.service';
import { Roles } from '../auth/decorators';
import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';

@ApiTags('Automations')
@ApiBearerAuth()
@SkipResponseTransform()
@Controller('ai/automation')
export class AutomationsController {
  constructor(private readonly service: AutomationsService) {}

  @Get('triggers')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar triggers disponíveis para Automations' })
  @ApiResponse({ status: 200, description: 'Catálogo estático com 18 triggers' })
  listTriggers() {
    return this.service.listTriggers();
  }
}
