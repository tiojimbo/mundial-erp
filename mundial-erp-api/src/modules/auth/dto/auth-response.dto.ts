import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { WorkspaceResponseDto } from '../../workspaces/dto/workspace-response.dto';

export class AuthTokensDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthTokensDto })
  tokens: AuthTokensDto;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiPropertyOptional({
    type: WorkspaceResponseDto,
    description:
      'Workspace ativo (resolvido via lastAccessed → unico → mais antigo). null se o usuario nao tem nenhum workspace ainda.',
  })
  workspace?: WorkspaceResponseDto | null;

  @ApiProperty({
    type: [WorkspaceResponseDto],
    description: 'Lista completa de workspaces dos quais o usuario e membro.',
  })
  availableWorkspaces: WorkspaceResponseDto[];
}
