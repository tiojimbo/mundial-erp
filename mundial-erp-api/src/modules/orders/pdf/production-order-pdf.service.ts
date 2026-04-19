import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import PDFDocument from 'pdfkit';

/**
 * Gera PDF "Ficha da Ordem de Producao" conforme PLANO 4.2d.
 *
 * Documento completo com:
 * - Cabecalho OP (numero, data, tipo, situacao)
 * - Dados operacionais (fluxo, maquina, lote)
 * - Pedido vinculado
 * - Dados do cliente + endereco entrega
 * - Produtos/servicos
 * - Materia-prima (consumptions)
 * - Produto acabado (outputs)
 * - Perda
 */
@Injectable()
export class ProductionOrderPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(productionOrderId: string): Promise<Buffer> {
    const po = await this.prisma.productionOrder.findFirst({
      where: { id: productionOrderId, deletedAt: null },
      include: {
        order: {
          include: {
            client: true,
            company: true,
          },
        },
        items: {
          include: {
            product: true,
            orderItem: true,
          },
        },
        consumptions: { include: { ingredient: true } },
        outputs: { include: { product: true } },
        losses: true,
        assignedUser: { select: { name: true } },
      },
    });

    if (!po) {
      throw new NotFoundException('Ordem de Producao nao encontrada');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;
      const order = po.order;
      const client = order.client;
      const company = order.company;

      // --- CABECALHO ---
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('ORDEM DE PRODUCAO', { align: 'center' });
      if (company) {
        doc
          .fontSize(8)
          .font('Helvetica')
          .text(`${company.name} - CNPJ: ${company.cnpj ?? ''}`, {
            align: 'center',
          });
      }
      doc.moveDown(0.5);
      this.drawLine(doc);

      // --- DADOS OP ---
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica');
      doc.text(
        `NUM OP: ${po.code}    DATA: ${new Date(po.createdAt).toLocaleDateString('pt-BR')}    TIPO: ${po.type ?? '-'}    SITUACAO: ${po.status}`,
      );
      doc.text(
        `Data Prevista: ${po.scheduledDate ? new Date(po.scheduledDate).toLocaleDateString('pt-BR') : '-'}    Data Conclusao: ${po.completedDate ? new Date(po.completedDate).toLocaleDateString('pt-BR') : '-'}`,
      );
      if (po.assignedUser) doc.text(`Responsavel: ${po.assignedUser.name}`);
      if (po.batch) doc.text(`Lote: ${po.batch}`);

      doc.moveDown(0.3);
      this.drawLine(doc);

      // --- PEDIDO VINCULADO ---
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold').text('PEDIDO VINCULADO');
      doc.fontSize(9).font('Helvetica');
      doc.text(
        `Cod: ${order.orderNumber}   Emissao: ${new Date(order.issueDate ?? order.createdAt).toLocaleDateString('pt-BR')}   Prev Entrega: ${order.deliveryDeadline ? new Date(order.deliveryDeadline).toLocaleDateString('pt-BR') : '-'}`,
      );
      doc.text(`Status: ${order.status}`);

      doc.moveDown(0.3);
      this.drawLine(doc);

      // --- DADOS DO CLIENTE ---
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold').text('DADOS DO CLIENTE');
      doc.fontSize(9).font('Helvetica');
      doc.text(
        `${client.name} | ${client.cpfCnpj} | Tel: ${client.phone ?? '-'} | Email: ${client.email ?? '-'}`,
      );
      doc.text(
        `ENDERECO DE ENTREGA: ${order.deliveryAddress ?? '-'}, ${order.deliveryNeighborhood ?? ''}, ${order.deliveryCity ?? ''} - ${order.deliveryState ?? ''} CEP: ${order.deliveryCep ?? ''}`,
      );
      if (order.notes) doc.text(`OBSERVACOES: ${order.notes}`);

      doc.moveDown(0.3);
      this.drawLine(doc);

      // --- PRODUTOS / SERVICOS ---
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold').text('PRODUTOS / SERVICOS');
      doc.moveDown(0.2);

      this.drawTableHeader(
        doc,
        ['Codigo', 'Produto', 'UNID', 'PECAS', 'TAMANHO', 'QUANT'],
        [60, pageWidth * 0.35, 40, 50, 55, 50],
      );

      doc.fontSize(8).font('Helvetica');
      for (const item of po.items) {
        const code = item.product?.code ?? '-';
        const name = item.product?.name ?? '-';

        this.drawTableRow(
          doc,
          [
            code,
            name,
            '-',
            item.pieces != null ? String(item.pieces) : '-',
            item.size != null ? String(item.size) : '-',
            String(item.quantity),
          ],
          [60, pageWidth * 0.35, 40, 50, 55, 50],
        );
      }

      doc.moveDown(0.3);
      this.drawLine(doc);

      // --- MATERIA PRIMA (consumptions) ---
      if (po.consumptions && po.consumptions.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica-Bold').text('MATERIA PRIMA');
        doc.moveDown(0.2);

        this.drawTableHeader(
          doc,
          ['Cod', 'Produto', 'Qtde Plan.', 'Qtde Real', 'Custo', 'CustoTot'],
          [40, pageWidth * 0.3, 55, 55, 60, 60],
        );

        doc.fontSize(8).font('Helvetica');
        for (const c of po.consumptions) {
          this.drawTableRow(
            doc,
            [
              c.ingredient?.code ?? '-',
              c.ingredient?.name ?? '-',
              String(c.plannedQuantity),
              c.actualQuantity != null ? String(c.actualQuantity) : '-',
              this.formatCurrency(c.costCents ?? 0),
              this.formatCurrency(c.totalCostCents ?? 0),
            ],
            [40, pageWidth * 0.3, 55, 55, 60, 60],
          );
        }

        doc.moveDown(0.3);
        this.drawLine(doc);
      }

      // --- PRODUTO ACABADO (outputs) ---
      if (po.outputs && po.outputs.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica-Bold').text('PRODUTO ACABADO');
        doc.moveDown(0.2);

        this.drawTableHeader(
          doc,
          ['Cod', 'Produto', 'UN', 'Qtde'],
          [50, pageWidth * 0.45, 40, 50],
        );

        doc.fontSize(8).font('Helvetica');
        for (const o of po.outputs) {
          this.drawTableRow(
            doc,
            [
              o.product?.code ?? '-',
              o.product?.name ?? '-',
              '-',
              String(o.quantity),
            ],
            [50, pageWidth * 0.45, 40, 50],
          );
        }

        doc.moveDown(0.3);
        this.drawLine(doc);
      }

      // --- PERDA ---
      if (po.losses && po.losses.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica-Bold').text('PERDA');
        doc.moveDown(0.2);

        doc.fontSize(8).font('Helvetica');
        for (const l of po.losses) {
          doc.text(
            `${l.description ?? '-'}: ${l.quantity ?? 0} — Custo: ${this.formatCurrency(l.costCents ?? 0)}`,
          );
        }

        doc.moveDown(0.3);
        this.drawLine(doc);
      }

      // --- NOTAS ---
      if (po.notes) {
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica');
        doc.text(`Observacoes: ${po.notes}`);
      }

      doc.end();
    });
  }

  private formatCurrency(cents: number): string {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  }

  private drawLine(doc: PDFKit.PDFDocument) {
    const y = doc.y;
    doc
      .moveTo(40, y)
      .lineTo(doc.page.width - 40, y)
      .stroke();
    doc.moveDown(0.2);
  }

  private drawTableHeader(
    doc: PDFKit.PDFDocument,
    headers: string[],
    widths: number[],
  ) {
    let x = 42;
    doc.fontSize(7).font('Helvetica-Bold');
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], x, doc.y, { width: widths[i], continued: false });
      x += widths[i];
    }
    doc.moveDown(0.2);
    this.drawLine(doc);
  }

  private drawTableRow(
    doc: PDFKit.PDFDocument,
    cells: string[],
    widths: number[],
  ) {
    let x = 42;
    const y = doc.y + 2;
    for (let i = 0; i < cells.length; i++) {
      doc.text(cells[i], x, y, { width: widths[i], continued: false });
      x += widths[i];
    }
    doc.moveDown(0.4);
  }
}
