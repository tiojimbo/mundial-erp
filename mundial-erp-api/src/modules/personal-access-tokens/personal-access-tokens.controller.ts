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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { PersonalAccessTokensService } from './personal-access-tokens.service';
import { CreatePersonalAccessTokenDto } from './dto/create-personal-access-token.dto';
import { PersonalAccessTokenResponseDto } from './dto/personal-access-token-response.dto';
import { PersonalAccessTokenCreatedDto } from './dto/personal-access-token-created.dto';
import { RequireJwt } from './decorators/require-jwt.decorator';

@ApiTags('API Keys')
@ApiBearerAuth()
@RequireJwt()
@Controller('api-keys')
export class PersonalAccessTokensController {
  constructor(private readonly service: PersonalAccessTokensService) {}

  @Get()
  @ApiOperation({ summary: 'Listar minhas API keys' })
  @ApiResponse({ status: 200, type: [PersonalAccessTokenResponseDto] })
  findAll(@CurrentUser() user: JwtPayload, @Query() pagination: PaginationDto) {
    return this.service.findManyByUser(user.sub, pagination);
  }

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Criar API key' })
  @ApiResponse({ status: 201, type: PersonalAccessTokenCreatedDto })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePersonalAccessTokenDto,
  ) {
    return this.service.create(user.sub, user.workspaceId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revogar API key (idempotente)' })
  @ApiResponse({ status: 204 })
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.revoke(id, user.sub);
  }
}
