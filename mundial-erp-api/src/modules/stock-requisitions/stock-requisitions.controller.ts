import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, StockRequisitionStatus, StockRequisitionType } from '@prisma/client';
import * as express from 'express';
import { StockRequisitionsService } from './stock-requisitions.service';
import { CreateStockRequisitionDto } from './dto/create-stock-requisition.dto';
import { ProcessItemDto } from './dto/process-item.dto';
import { StockRequisitionResponseDto } from './dto/stock-requisition-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import { RequisitionPdfService } from './pdf/requisition-pdf.service';

@ApiTags('Stock Requisitions')
@ApiBearerAuth()
@Controller('stock-requisitions')
export class StockRequisitionsController {
  constructor(
    private readonly service: StockRequisitionsService,
    private readonly pdfService: RequisitionPdfService,
  ) {}

  // POST /stock-requisitions
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Criar requisicao de estoque (VENDA ou INTERNO)' })
  @ApiResponse({ status: 201, type: StockRequisitionResponseDto })
  create(
    @Body() dto: CreateStockRequisitionDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.create(dto, userId);
  }

  // GET /stock-requisitions
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar requisicoes (filtro por type, status, data)' })
  @ApiQuery({ name: 'type', required: false, enum: StockRequisitionType })
  @ApiQuery({ name: 'status', required: false, enum: StockRequisitionStatus })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data inicial (ISO)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data final (ISO)' })
  @ApiResponse({ status: 200, type: StockRequisitionResponseDto, isArray: true })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('type') type?: StockRequisitionType,
    @Query('status') status?: StockRequisitionStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.findAll(pagination, { type, status, startDate, endDate });
  }

  // GET /stock-requisitions/code/:code (buscar por codigo — usado pelo scanner)
  @Get('code/:code')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar requisicao por codigo (scan Code-128)' })
  @ApiResponse({ status: 200, type: StockRequisitionResponseDto })
  @ApiResponse({ status: 404, description: 'Requisicao nao encontrada' })
  findByCode(@Param('code') code: string) {
    return this.service.findByCode(code);
  }

  // GET /stock-requisitions/:id
  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Detalhe da requisicao com itens e status de processamento' })
  @ApiResponse({ status: 200, type: StockRequisitionResponseDto })
  @ApiResponse({ status: 404, description: 'Requisicao nao encontrada' })
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  // PATCH /stock-requisitions/:id/approve
  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Aprovar requisicao' })
  @ApiResponse({ status: 200, type: StockRequisitionResponseDto })
  @ApiResponse({ status: 400, description: 'Status invalido para aprovacao' })
  approve(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.approve(id, userId);
  }

  // PATCH /stock-requisitions/:id/items/:itemId/process
  @Patch(':id/items/:itemId/process')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Processar item individual (apos scan EAN): baixa estoque' })
  @ApiResponse({ status: 200, type: StockRequisitionResponseDto })
  @ApiResponse({ status: 400, description: 'Item ja processado ou status invalido' })
  processItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: ProcessItemDto,
  ) {
    return this.service.processItem(id, itemId, dto);
  }

  // PATCH /stock-requisitions/:id/complete
  @Patch(':id/complete')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Marcar como PROCESSED (todos itens processados)' })
  @ApiResponse({ status: 200, type: StockRequisitionResponseDto })
  @ApiResponse({ status: 400, description: 'Itens pendentes ou status invalido' })
  complete(@Param('id') id: string) {
    return this.service.complete(id);
  }

  // GET /stock-requisitions/:id/pdf
  @Get(':id/pdf')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Gerar PDF da requisicao com barcode Code-128' })
  @ApiResponse({ status: 200, description: 'PDF binario' })
  async getPdf(@Param('id') id: string, @Res() res: express.Response) {
    const buffer = await this.pdfService.generate(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="requisicao-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // DELETE /stock-requisitions/:id
  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir requisicao permanentemente' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: 'Requisicao ja processada' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
