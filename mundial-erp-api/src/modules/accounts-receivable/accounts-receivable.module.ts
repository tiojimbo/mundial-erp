import { Module } from '@nestjs/common';
import { AccountsReceivableController } from './accounts-receivable.controller';
import { AccountsReceivableService } from './accounts-receivable.service';
import { AccountsReceivableRepository } from './accounts-receivable.repository';

@Module({
  controllers: [AccountsReceivableController],
  providers: [AccountsReceivableRepository, AccountsReceivableService],
  exports: [AccountsReceivableService, AccountsReceivableRepository],
})
export class AccountsReceivableModule {}
