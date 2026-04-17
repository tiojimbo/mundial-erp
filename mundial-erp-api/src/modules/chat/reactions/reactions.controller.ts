import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { ReactionsService } from './reactions.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { CursorPaginationDto } from '../../../common/dtos/cursor-pagination.dto';
import { CurrentUser } from '../../auth/decorators';

@ApiTags('Chat - Reactions')
@ApiBearerAuth()
@Controller('chat/messages/:messageId/reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar reacao (ClickUp #14)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'Reacao ja existe' })
  addReaction(
    @Param('messageId', ParseCuidPipe) messageId: string,
    @Body() dto: CreateReactionDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.reactionsService.addReaction(messageId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar reacoes agrupadas (ClickUp #15)' })
  getReactions(
    @Param('messageId', ParseCuidPipe) messageId: string,
    @Query() query: CursorPaginationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.reactionsService.getReactions(messageId, query, userId);
  }

  @Delete(':emojiName')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover reacao (ClickUp #16)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Reacao nao encontrada' })
  removeReaction(
    @Param('messageId', ParseCuidPipe) messageId: string,
    @Param('emojiName') emojiName: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.reactionsService.removeReaction(messageId, emojiName, userId);
  }
}
