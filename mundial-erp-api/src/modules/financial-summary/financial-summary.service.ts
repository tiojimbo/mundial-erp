import { Injectable, Logger } from '@nestjs/common';
import { FinancialSummaryRepository } from './financial-summary.repository';
import { FinancialSummaryResponseDto } from './dto/financial-summary-response.dto';

@Injectable()
export class FinancialSummaryService {
  private readonly logger = new Logger(FinancialSummaryService.name);

  constructor(private readonly repository: FinancialSummaryRepository) {}

  async getSummary(workspaceId: string): Promise<FinancialSummaryResponseDto> {
    const now = new Date();

    const [
      receivableAgg,
      overdueReceivable,
      payableAgg,
      overduePayable,
      invoiceAgg,
    ] = await Promise.all([
      this.repository.aggregateReceivables(workspaceId),
      this.repository.aggregateOverdueReceivables(workspaceId, now),
      this.repository.aggregatePayables(workspaceId),
      this.repository.aggregateOverduePayables(workspaceId, now),
      this.repository.aggregateInvoices(workspaceId),
    ]);

    const totalReceivableCents = receivableAgg._sum.amountCents ?? 0;
    const totalReceivedCents = receivableAgg._sum.paidAmountCents ?? 0;
    const totalPayableCents = payableAgg._sum.amountCents ?? 0;
    const totalPaidCents = payableAgg._sum.paidAmountCents ?? 0;

    const pendingReceivable = totalReceivableCents - totalReceivedCents;
    const pendingPayable = totalPayableCents - totalPaidCents;

    const dto = new FinancialSummaryResponseDto();
    dto.totalReceivableCents = totalReceivableCents;
    dto.totalReceivedCents = totalReceivedCents;
    dto.totalOverdueReceivableCents = overdueReceivable._sum.amountCents ?? 0;
    dto.overdueReceivableCount = overdueReceivable._count;
    dto.totalPayableCents = totalPayableCents;
    dto.totalPaidCents = totalPaidCents;
    dto.totalOverduePayableCents = overduePayable._sum.amountCents ?? 0;
    dto.overduePayableCount = overduePayable._count;
    dto.projectedBalanceCents = pendingReceivable - pendingPayable;
    dto.invoiceCount = invoiceAgg._count;
    dto.invoiceTotalCents = invoiceAgg._sum.totalCents ?? 0;

    return dto;
  }
}
