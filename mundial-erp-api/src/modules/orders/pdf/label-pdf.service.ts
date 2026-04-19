import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductClassification } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import PDFDocument from 'pdfkit';

/**
 * Gera etiquetas de Producao (PLANO 4.2b) e Separacao (PLANO 4.2c).
 *
 * Etiqueta 1 (Producao): itens FABRICACAO_PROPRIA
 * Etiqueta 2 (Separacao): itens REVENDA_ESTOQUE / INSUMO
 */
@Injectable()
export class LabelPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generateProductionLabel(orderId: string): Promise<Buffer> {
    const order = await this.loadOrder(orderId);
    const items = order.items.filter(
      (item) =>
        item.classificationSnapshot ===
        ProductClassification.FABRICACAO_PROPRIA,
    );

    if (items.length === 0) {
      throw new NotFoundException(
        'Nenhum item de FABRICACAO_PROPRIA neste pedido',
      );
    }

    return this.buildLabel(order, items, 'PRODUCAO');
  }

  async generateSeparationLabel(orderId: string): Promise<Buffer> {
    const order = await this.loadOrder(orderId);
    const items = order.items.filter(
      (item) =>
        item.classificationSnapshot === ProductClassification.REVENDA ||
        item.classificationSnapshot === ProductClassification.INSUMO,
    );

    if (items.length === 0) {
      throw new NotFoundException('Nenhum item de REVENDA/INSUMO neste pedido');
    }

    return this.buildLabel(order, items, 'SEPARACAO');
  }

  private async loadOrder(orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: {
        client: true,
        company: true,
        items: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: { product: true },
        },
        productionOrders: { where: { deletedAt: null }, take: 1 },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    return order;
  }

  private buildLabel(
    order: Record<string, unknown>,
    items: Record<string, unknown>[],
    tipo: string,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: [283, 425], margin: 10 }); // ~10x15cm
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const company = order.company as Record<string, unknown> | null;

      // --- CABECALHO EMPRESA ---
      if (company) {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(company.name as string, { align: 'center' });
        doc.fontSize(6).font('Helvetica');
        doc.text(
          `CNPJ: ${(company.cnpj as string) ?? ''}  IE: ${(company.ie as string) ?? ''}`,
          { align: 'center' },
        );
        doc.text(
          `${(company.address as string) ?? ''}, ${(company.city as string) ?? ''} - ${(company.state as string) ?? ''}`,
          { align: 'center' },
        );
      }

      doc.moveDown(0.3);
      this.drawLine(doc, 10, doc.page.width - 10);

      // --- ORDEM DE PRODUCAO / SEPARACAO ---
      doc.moveDown(0.2);
      const productionOrders = order.productionOrders as
        | Record<string, unknown>[]
        | undefined;
      const poCode =
        productionOrders?.[0]?.code ??
        `O${tipo === 'PRODUCAO' ? 'P' : 'S'}-${order.orderNumber as string}`;
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text(
        `Ordem de ${tipo === 'PRODUCAO' ? 'Producao' : 'Separacao'} Codigo: ${poCode}`,
      );
      doc.fontSize(7).font('Helvetica');
      doc.text(
        `Data Prevista: ${order.deliveryDeadline ? new Date(order.deliveryDeadline as string).toLocaleDateString('pt-BR') : '-'}`,
      );

      doc.moveDown(0.3);
      this.drawLine(doc, 10, doc.page.width - 10);

      // --- TABELA ITENS ---
      doc.moveDown(0.2);
      const colWidths = [35, 100, 30, 20, 25, 25];
      const headers = ['Cod', 'Descricao', 'Qtde', 'Un', 'Pcs', 'Tam'];
      let x = 12;

      doc.fontSize(6).font('Helvetica-Bold');
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], x, doc.y, {
          width: colWidths[i],
          continued: false,
        });
        x += colWidths[i];
      }

      doc.moveDown(0.2);
      this.drawLine(doc, 10, doc.page.width - 10);

      doc.fontSize(6).font('Helvetica');
      let totalQtd = 0;
      for (const item of items) {
        x = 12;
        const y = doc.y + 2;
        const product = item.product as
          | Record<string, unknown>
          | null
          | undefined;
        const code = (product?.code as string) ?? '-';
        const name = (product?.name as string) ?? '-';
        const unit = '-';

        doc.text(code, x, y, { width: colWidths[0] });
        x += colWidths[0];
        doc.text(name, x, y, { width: colWidths[1] });
        x += colWidths[1];
        doc.text(String(item.quantity as number), x, y, {
          width: colWidths[2],
        });
        x += colWidths[2];
        doc.text(unit, x, y, { width: colWidths[3] });
        x += colWidths[3];
        doc.text(
          item.pieces != null ? String(item.pieces as number) : '-',
          x,
          y,
          { width: colWidths[4] },
        );
        x += colWidths[4];
        doc.text(item.size != null ? String(item.size as number) : '-', x, y, {
          width: colWidths[5],
        });
        doc.moveDown(0.5);
        totalQtd += item.quantity as number;
      }

      doc.moveDown(0.2);
      this.drawLine(doc, 10, doc.page.width - 10);
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text(`Qtd. Total de Itens: ${totalQtd}`);

      doc.moveDown(0.3);
      this.drawLine(doc, 10, doc.page.width - 10);

      // --- DADOS DO CLIENTE ---
      doc.moveDown(0.2);
      const client = order.client as Record<string, unknown>;
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text(
        `${(client.personType as string) === 'F' ? 'CONSUMIDOR' : 'EMPRESA'} - ${(client.personType as string) === 'F' ? 'CPF' : 'CNPJ'} ${client.cpfCnpj as string}`,
      );
      doc.fontSize(7).font('Helvetica');
      doc.text(client.name as string);
      doc.text(`Endereco Entrega:`);
      doc.text(
        `${(order.deliveryAddress as string) ?? '-'}, ${(order.deliveryNeighborhood as string) ?? ''}`,
      );
      doc.text(
        `${(order.deliveryCity as string) ?? ''} - ${(order.deliveryState as string) ?? ''} CEP: ${(order.deliveryCep as string) ?? ''}`,
      );

      doc.moveDown(0.3);
      this.drawLine(doc, 10, doc.page.width - 10);

      // --- RODAPE ---
      doc.moveDown(0.2);
      doc.fontSize(7).font('Helvetica');
      doc.text(
        `Pedido n.: ${order.orderNumber as string} | Data: ${new Date((order.issueDate ?? order.createdAt) as string).toLocaleDateString('pt-BR')}`,
      );

      doc.end();
    });
  }

  private drawLine(doc: PDFKit.PDFDocument, x1: number, x2: number) {
    const y = doc.y;
    doc.moveTo(x1, y).lineTo(x2, y).stroke();
    doc.moveDown(0.1);
  }
}
