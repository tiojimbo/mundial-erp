import { ApiProperty } from '@nestjs/swagger';

export class ReactionGroupResponseDto {
  @ApiProperty() emojiName: string;
  @ApiProperty() count: number;
  @ApiProperty({ type: [String] }) userIds: string[];
  @ApiProperty({ type: [String] }) userNames: string[];
}
