import { Module } from '@nestjs/common';
import { CnpjLookupCache } from './cnpj-lookup.cache';
import { CnpjLookupController } from './cnpj-lookup.controller';
import { CnpjLookupService } from './cnpj-lookup.service';
import { BrasilApiProvider } from './providers/brasil-api.provider';
import { ReceitaWsProvider } from './providers/receita-ws.provider';

@Module({
  controllers: [CnpjLookupController],
  providers: [
    CnpjLookupCache,
    CnpjLookupService,
    BrasilApiProvider,
    ReceitaWsProvider,
  ],
})
export class CnpjLookupModule {}
