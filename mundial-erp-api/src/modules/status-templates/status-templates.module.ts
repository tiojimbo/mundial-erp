import { Module } from '@nestjs/common';
import { StatusTemplatesController } from './status-templates.controller';
import { StatusTemplatesService } from './status-templates.service';
import { StatusTemplatesRepository } from './status-templates.repository';

@Module({
  controllers: [StatusTemplatesController],
  providers: [StatusTemplatesService, StatusTemplatesRepository],
  exports: [StatusTemplatesService],
})
export class StatusTemplatesModule {}
