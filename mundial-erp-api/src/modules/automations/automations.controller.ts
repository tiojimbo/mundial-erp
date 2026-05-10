import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AutomationsService } from './automations.service';
import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';

@ApiTags('Automations')
@ApiBearerAuth()
@SkipResponseTransform()
@Controller('ai/automation')
export class AutomationsController {
  constructor(private readonly service: AutomationsService) {}
}
