import { Injectable } from '@nestjs/common';
import { AutomationsRepository } from './automations.repository';

@Injectable()
export class AutomationsService {
  constructor(private readonly repository: AutomationsRepository) {}
}
