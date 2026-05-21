import { ApiProperty } from '@nestjs/swagger';

export type ReactionAction = 'added' | 'removed';

export class ReactionResponseDto {
  @ApiProperty({ enum: ['added', 'removed'] })
  action!: ReactionAction;

  @ApiProperty()
  commentId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  emoji!: string;
}
