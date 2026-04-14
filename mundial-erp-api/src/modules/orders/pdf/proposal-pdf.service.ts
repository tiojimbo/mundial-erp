import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import PDFDocument from 'pdfkit';

/**
 * Gera PDF "Proposta de Venda" conforme PLANO 4.1/4.2.
 *
 * Layout:
 * - Cabecalho: logo empresa, "PROPOSTA DE VENDA", data, pagina, numero pedido
 * - Dados do cliente: nome, CNPJ/CPF, IE, telefone, celular, email, endereco
 * - Info comercial + entrega
 * - Tabela de produtos: produto, S/Carga, Beta, FCK, Qtd, Un, V.Un, VT
 * - Resumo financeiro: subtotal, frete, desconto, subst. trib./IPI, total
 * - Assinaturas: vendedor e cliente
 */
@Injectable()
export class ProposalPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(orderId: string): Promise<Buffer> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: {
        client: true,
        company: true,
        paymentMethod: true,
        carrier: true,
        createdBy: { select: { name: true } },
        items: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;

      // --- CABECALHO ---
      doc.fontSize(16).font('Helvetica-Bold').text('PROPOSTA DE VENDA', { align: 'center' });
      doc.moveDown(0.5);

      const company = order.company;
      if (company) {
        doc.fontSize(8).font('Helvetica')
          .text(company.name, { align: 'center' })
          .text(`CNPJ: ${company.cnpj ?? ''} | IE: ${company.ie ?? ''}`, { align: 'center' })
          .text(`${company.address ?? ''}, ${company.city ?? ''} - ${company.state ?? ''}`, { align: 'center' });
      }

      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica')
        .text(`Data: ${new Date(order.issueDate ?? order.createdAt).toLocaleDateString('pt-BR')}`, { align: 'right' })
        .text(`Pedido n.: ${order.orderNumber}`, { align: 'right' });

      doc.moveDown(0.5);
      this.drawLine(doc);

      // --- DADOS DO CLIENTE ---
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold').text('DADOS DO CLIENTE');
      doc.fontSize(9).font('Helvetica');

      const client = order.client;
      doc.text(`Nome: ${client.name}${client.tradeName ? ` (${client.tradeName})` : ''}`);
      doc.text(`CPF/CNPJ: ${client.cpfCnpj}   IE: ${client.ie ?? '-'}`);
      doc.text(`Tel: ${client.phone ?? '-'}   Email: ${client.email ?? '-'}`);
      doc.text(`Endereco: ${client.address ?? ''}, ${client.neighborhood ?? ''}, ${client.city ?? ''} - ${client.state ?? ''} CEP: ${client.zipCode ?? ''}`);

      doc.moveDown(0.3);
      this.drawLine(doc);

      // --- INFO COMERCIAL + ENTREGA ---
      doc.moveDown(0.3);
      const midX = 40 + pageWidth / 2;

      doc.fontSize(10).font('Helvetica-Bold').text('INFO COMERCIAL', 40);
      doc.fontSize(9).font('Helvetica');
      doc.text(`Prazo entrega: ${order.deliveryDeadline ? new Date(order.deliveryDeadline).toLocaleDateString('pt-BR') : '-'}`);
      doc.text(`Pagamento: ${order.paymentMethod?.name ?? '-'}`);
      doc.text(`Validade: ${order.proposalValidityDays} dias`);
      doc.text(`Produzir: ${order.shouldProduce ? 'Sim' : 'Nao'}   Revenda: ${order.isResale ? 'Sim' : 'Nao'}   Subst. Trib.: ${order.hasTaxSubstitution ? 'Sim' : 'Nao'}`);

      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold').text('ENDERECO DE ENTREGA');
      doc.fontSize(9).font('Helvetica');
      doc.text(`${order.deliveryAddress ?? '-'}, ${order.deliveryNeighborhood ?? ''}`);
      doc.text(`${order.deliveryCity ?? ''} - ${order.deliveryState ?? ''} CEP: ${order.deliveryCep ?? ''}`);
      doc.text(`Ref: ${order.deliveryReferencePoint ?? '-'}`);
      if (order.contactName) doc.text(`Contato: ${order.contactName}`);

      doc.moveDown(0.3);
      this.drawLine(doc);

      // --- TABELA DE PRODUTOS ---
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold').text('PRODUTOS');
      doc.moveDown(0.3);

      // Cabecalho tabela
      const cols = [
        { label: 'Produto', width: pageWidth * 0.35 },
        { label: 'Qtd', width: pageWidth * 0.08 },
        { label: 'Un', width: pageWidth * 0.06 },
        { label: 'Pecas', width: pageWidth * 0.08 },
        { label: 'Tam', width: pageWidth * 0.08 },
        { label: 'V.Unit', width: pageWidth * 0.15 },
        { label: 'V.Total', width: pageWidth * 0.15 },
      ];

      let x = 40;
      doc.fontSize(8).font('Helvetica-Bold');
      for (const col of cols) {
        doc.text(col.label, x, doc.y, { width: col.width, continued: false });
        x += col.width;
      }
      doc.moveDown(0.3);
      this.drawLine(doc);

      // Linhas
      doc.fontSize(8).font('Helvetica');
      for (const item of order.items) {
        x = 40;
        const y = doc.y + 3;
        const productName = item.product?.name ?? `Produto ${item.productId}`;
        const unit = '-';

        doc.text(productName, x, y, { width: cols[0].width }); x += cols[0].width;
        doc.text(String(item.quantity), x, y, { width: cols[1].width }); x += cols[1].width;
        doc.text(unit, x, y, { width: cols[2].width }); x += cols[2].width;
        doc.text(item.pieces != null ? String(item.pieces) : '-', x, y, { width: cols[3].width }); x += cols[3].width;
        doc.text(item.size != null ? String(item.size) : '-', x, y, { width: cols[4].width }); x += cols[4].width;
        doc.text(this.formatCurrency(item.unitPriceCents), x, y, { width: cols[5].width }); x += cols[5].width;
        doc.text(this.formatCurrency(item.totalCents), x, y, { width: cols[6].width });
        doc.moveDown(0.5);
      }

      doc.moveDown(0.3);
      this.drawLine(doc);

      // --- RESUMO FINANCEIRO ---
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold').text('RESUMO FINANCEIRO');
      doc.fontSize(9).font('Helvetica');

      const rightX = 40 + pageWidth * 0.6;
      const valWidth = pageWidth * 0.35;

      doc.text(`Subtotal:`, rightX); doc.text(this.formatCurrency(order.subtotalCents), rightX + 120, doc.y - 12);
      doc.text(`Frete:`, rightX); doc.text(this.formatCurrency(order.freightCents), rightX + 120, doc.y - 12);
      doc.text(`Desconto:`, rightX); doc.text(`- ${this.formatCurrency(order.discountCents)}`, rightX + 120, doc.y - 12);
      doc.text(`Subst. Trib./IPI:`, rightX); doc.text(this.formatCurrency(order.taxSubstitutionCents), rightX + 120, doc.y - 12);

      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text(`TOTAL A PAGAR:`, rightX); doc.text(this.formatCurrency(order.totalCents), rightX + 120, doc.y - 14);

      // --- ASSINATURAS ---
      doc.moveDown(3);
      const sigY = doc.y;
      doc.fontSize(9).font('Helvetica');
      doc.text('________________________', 80, sigY, { align: 'left' });
      doc.text('Vendedor', 110, sigY + 12);

      doc.text('________________________', 350, sigY, { align: 'left' });
      doc.text('Cliente', 390, sigY + 12);

      doc.end();
    });
  }

  private formatCurrency(cents: number): string {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  }

  private drawLine(doc: PDFKit.PDFDocument) {
    const y = doc.y;
    doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke();
    doc.moveDown(0.2);
  }
}
