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
} from '@nestjs/common';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { CursorPaginationDto } from '../../../common/dtos/cursor-pagination.dto';
import { CurrentUser } from '../../auth/decorators';

@ApiTags('Chat - Channel Messages')
@ApiBearerAuth()
@Controller('chat/channels/:channelId/messages')
export class ChannelMessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Enviar mensagem (ClickUp #10)' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 404, description: 'Canal nao encontrado' })
  create(
    @Param('channelId', ParseCuidPipe) channelId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messagesService.create(channelId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar mensagens do canal (ClickUp #11)' })
  findByChannel(
    @Param('channelId', ParseCuidPipe) channelId: string,
    @Query() query: ListMessagesQueryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messagesService.findByChannel(channelId, query, userId);
  }

  @Get(':messageId')
  @ApiOperation({ summary: 'Buscar mensagem por ID' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 404, description: 'Mensagem nao encontrada' })
  findOne(
    @Param('messageId', ParseCuidPipe) messageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messagesService.findById(messageId, userId);
  }
}

@ApiTags('Chat - Messages')
@ApiBearerAuth()
@Controller('chat/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Patch(':messageId')
  @ApiOperation({ summary: 'Editar mensagem (ClickUp #12)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  update(
    @Param('messageId', ParseCuidPipe) messageId: string,
    @Body() dto: UpdateMessageDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messagesService.update(messageId, dto, userId);
  }

  @Delete(':messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar mensagem (ClickUp #13)' })
  @ApiResponse({ status: 204 })
  remove(
    @Param('messageId', ParseCuidPipe) messageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messagesService.remove(messageId, userId);
  }

  @Get(':messageId/replies')
  @ApiOperation({ summary: 'Listar replies de mensagem (ClickUp #18)' })
  findReplies(
    @Param('messageId', ParseCuidPipe) messageId: string,
    @Query() query: CursorPaginationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messagesService.findReplies(messageId, query, userId);
  }

  @Get(':messageId/tagged-users')
  @ApiOperation({ summary: 'Listar usuarios mencionados (ClickUp #19)' })
  findTaggedUsers(
    @Param('messageId', ParseCuidPipe) messageId: string,
    @Query() query: CursorPaginationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.messagesService.findTaggedUsers(messageId, query, userId);
  }
}
