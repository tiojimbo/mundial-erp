import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';

@Injectable()
export class RequisitionPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(requisitionId: string): Promise<Buffer> {
    const requisition = await this.prisma.stockRequisition.findFirst({
      where: { id: requisitionId, deletedAt: null },
      include: {
        requestedBy: { select: { name: true } },
        order: { select: { orderNumber: true } },
        items: {
          where: { deletedAt: null },
          include: {
            product: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!requisition) {
      throw new NotFoundException('Requisicao nao encontrada');
    }

    const company = await this.prisma.company.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    const barcodePng = await this.generateBarcode(requisition.code);

    return this.buildPdf(requisition, company, barcodePng);
  }

  private async generateBarcode(text: string): Promise<Buffer> {
    return bwipjs.toBuffer({
      bcid: 'code128',
      text,
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: 'center',
      textsize: 8,
    });
  }

  private buildPdf(
    requisition: Record<string, unknown>,
    company: Record<string, unknown> | null,
    barcodePng: Buffer,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // --- CABECALHO EMPRESA ---
      if (company) {
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(company.name as string, { align: 'center' });
        doc.fontSize(9).font('Helvetica');
        doc.text(
          `CNPJ: ${(company.cnpj as string) ?? ''}  IE: ${(company.ie as string) ?? ''}`,
          { align: 'center' },
        );
        doc.text(
          `${(company.address as string) ?? ''}, ${(company.city as string) ?? ''} - ${(company.state as string) ?? ''}`,
          { align: 'center' },
        );
      }

      doc.moveDown(0.5);
      this.drawLine(doc);

      // --- IDENTIFICACAO ---
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`Requisicao de Estoque`, { align: 'center' });
      doc.fontSize(10).font('Helvetica');
      doc.text(`Codigo: ${requisition.code as string}`, { align: 'center' });
      doc.text(
        `Data: ${new Date(requisition.requestedAt as string).toLocaleDateString('pt-BR')}`,
        { align: 'center' },
      );
      doc.text(
        `Tipo: ${(requisition.type as string) === 'VENDA' ? 'Venda' : 'Interno'}`,
        { align: 'center' },
      );
      const reqOrder = requisition.order as Record<string, unknown> | null;
      if (reqOrder) {
        doc.text(`Pedido: ${reqOrder.orderNumber as string}`, {
          align: 'center',
        });
      }

      // --- BARCODE CODE-128 ---
      doc.moveDown(0.5);
      const barcodeWidth = 200;
      const barcodeX = (doc.page.width - barcodeWidth) / 2;
      doc.image(barcodePng, barcodeX, doc.y, { width: barcodeWidth });
      doc.moveDown(3);

      doc.moveDown(0.5);
      this.drawLine(doc);

      // --- TABELA DE ITENS ---
      doc.moveDown(0.5);
      const tableLeft = 40;
      const colWidths = [60, 220, 60, 40, 60, 80];
      const headers = [
        'Codigo',
        'Descricao',
        'Qtde',
        'Un',
        'Un/Cx',
        'Qtde Base',
      ];

      doc.fontSize(9).font('Helvetica-Bold');
      let x = tableLeft;
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], x, doc.y, {
          width: colWidths[i],
          continued: false,
        });
        x += colWidths[i];
      }

      doc.moveDown(0.3);
      this.drawLine(doc);
      doc.moveDown(0.2);

      doc.fontSize(9).font('Helvetica');
      let totalQtd = 0;
      const reqItems = requisition.items as Record<string, unknown>[];
      for (const item of reqItems) {
        x = tableLeft;
        const y = doc.y;
        const product = item.product as
          | Record<string, unknown>
          | null
          | undefined;
        doc.text((product?.code as string) ?? '-', x, y, {
          width: colWidths[0],
        });
        x += colWidths[0];
        doc.text((product?.name as string) ?? '-', x, y, {
          width: colWidths[1],
        });
        x += colWidths[1];
        doc.text(String(item.requestedQuantity as number), x, y, {
          width: colWidths[2],
        });
        x += colWidths[2];
        doc.text(item.unitType as string, x, y, { width: colWidths[3] });
        x += colWidths[3];
        doc.text(
          item.unitsPerBox != null ? String(item.unitsPerBox as number) : '-',
          x,
          y,
          { width: colWidths[4] },
        );
        x += colWidths[4];
        doc.text(String(item.quantityInBaseUnit as number), x, y, {
          width: colWidths[5],
        });
        doc.moveDown(0.8);
        totalQtd += item.quantityInBaseUnit as number;
      }

      doc.moveDown(0.3);
      this.drawLine(doc);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`Quantidade Total (base): ${totalQtd}`);

      doc.moveDown(0.5);
      this.drawLine(doc);

      // --- DADOS DO SOLICITANTE ---
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      const requestedBy = requisition.requestedBy as
        | Record<string, unknown>
        | null
        | undefined;
      doc.text(`Solicitante: ${(requestedBy?.name as string) ?? '-'}`);
      if (requisition.notes) {
        doc.text(`Observacoes: ${requisition.notes as string}`);
      }

      // --- CAMPOS DE ASSINATURA ---
      doc.moveDown(2);
      const signY = doc.y;
      const leftSignX = 60;
      const rightSignX = 320;
      const lineWidth = 180;

      doc
        .moveTo(leftSignX, signY)
        .lineTo(leftSignX + lineWidth, signY)
        .stroke();
      doc.fontSize(9).text('Solicitante', leftSignX, signY + 5, {
        width: lineWidth,
        align: 'center',
      });

      doc
        .moveTo(rightSignX, signY)
        .lineTo(rightSignX + lineWidth, signY)
        .stroke();
      doc.text('Resp. Estoque', rightSignX, signY + 5, {
        width: lineWidth,
        align: 'center',
      });

      doc.end();
    });
  }

  private drawLine(doc: PDFKit.PDFDocument) {
    const y = doc.y;
    doc
      .moveTo(40, y)
      .lineTo(doc.page.width - 40, y)
      .stroke();
    doc.moveDown(0.1);
  }
}
