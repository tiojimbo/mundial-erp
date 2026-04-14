import { Module } from '@nestjs/common';
import { AccountsPayableRepository } from './accounts-payable.repository';
import { AccountsPayableService } from './accounts-payable.service';
import { AccountsPayableController } from './accounts-payable.controller';

@Module({
  controllers: [AccountsPayableController],
  providers: [AccountsPayableRepository, AccountsPayableService],
  exports: [AccountsPayableService, AccountsPayableRepository],
})
export class AccountsPayableModule {}
