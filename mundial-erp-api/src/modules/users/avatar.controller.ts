import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { Public } from '../auth/decorators';
import { SkipWorkspaceGuard } from '../workspaces/decorators/skip-workspace-guard.decorator';

@ApiTags('Avatars')
@Controller('avatars')
export class AvatarController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users/:file')
  @Public()
  @SkipWorkspaceGuard()
  @ApiOperation({ summary: 'Redireciona para a URL assinada do avatar (R2)' })
  async getUserAvatar(
    @Param('file') file: string,
    @Res() res: Response,
  ): Promise<void> {
    const url = await this.usersService.getAvatarSignedUrl(
      `avatars/users/${file}`,
    );
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.redirect(302, url);
  }
}
