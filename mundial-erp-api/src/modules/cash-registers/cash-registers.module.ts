import { Module } from '@nestjs/common';
import { CashRegistersController } from './cash-registers.controller';
import { CashRegistersService } from './cash-registers.service';
import { CashRegistersRepository } from './cash-registers.repository';

@Module({
  controllers: [CashRegistersController],
  providers: [CashRegistersService, CashRegistersRepository],
  exports: [CashRegistersService, CashRegistersRepository],
})
export class CashRegistersModule {}
